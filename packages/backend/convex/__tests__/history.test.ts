import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import type { TestBackend, TestMember } from './harness.testing';
import {
  activeWorkout,
  exerciseId,
  memberWithRoutine,
  START,
  useWorkoutClock,
} from './workoutFixtures.testing';

beforeEach(useWorkoutClock);
afterEach(() => vi.useRealTimers());

const at = (seconds: number) => vi.setSystemTime(START + seconds * 1000);

async function logFirst(member: TestMember, seconds: number) {
  const exercise = (await activeWorkout(member)).exercises[0];
  const set = exercise?.sets[0];
  if (!set) throw new Error('missing planned Set');
  at(seconds);
  await member.mutation(api.workouts.completeSet, {
    setId: set._id,
    weightKg: 60,
    reps: 8,
    effort: { scale: 'RPE', value: 8 },
  });
}

/**
 * Inserts completed Workouts for member-a straight into the tables, one per
 * entry: it finishes at START + `finishedAfter` seconds with `sets` completed
 * Bench Press Sets of 60 kg × 1.
 */
async function insertCompleted(
  t: TestBackend,
  workouts: readonly { finishedAfter: number; sets: number }[]
) {
  const benchId = await exerciseId(t, 'bench-press');
  return t.run(async (ctx) => {
    const ids: Id<'workouts'>[] = [];
    for (const { finishedAfter, sets } of workouts) {
      const finishedAt = START + finishedAfter * 1000;
      const workoutId = await ctx.db.insert('workouts', {
        userId: 'member-a',
        name: 'Inserted',
        status: 'completed',
        startedAt: finishedAt - 60_000,
        finishedAt,
        finishReason: 'all_sets_done',
      });
      const workoutExerciseId = await ctx.db.insert('workoutExercises', {
        workoutId,
        exerciseId: benchId,
        order: 0,
        repRangeMin: 1,
        repRangeMax: 1,
        stepKg: 2.5,
      });
      for (let order = 0; order < sets; order++) {
        await ctx.db.insert('sets', {
          userId: 'member-a',
          workoutId,
          workoutExerciseId,
          exerciseId: benchId,
          order,
          type: 'normal',
          weightKg: 60,
          reps: 1,
          completedAt: finishedAt,
        });
      }
      ids.push(workoutId);
    }
    return ids;
  });
}

describe('Workout history', () => {
  test('paginates only the member’s completed Workouts by newest finish, including terminated Workouts', async () => {
    const { t, member, routineId } = await memberWithRoutine();
    const firstId = await member.mutation(api.workouts.start, { routineId });
    for (const [index, set] of (await activeWorkout(member)).exercises
      .flatMap((exercise) => exercise.sets)
      .entries()) {
      at(30 * (index + 1));
      await member.mutation(api.workouts.completeSet, {
        setId: set._id,
        weightKg: 60,
        reps: 8,
      });
    }
    await member.mutation(api.workouts.end, {
      workoutId: firstId,
      reason: 'finish',
    });

    at(300);
    const abandonedId = await member.mutation(api.workouts.start, {
      routineId,
    });
    expect(
      await member.mutation(api.workouts.end, {
        workoutId: abandonedId,
        reason: 'terminate',
      })
    ).toBe('abandoned');

    const other = t.withIdentity({ subject: 'member-b' });
    at(400);
    const otherId = await other.mutation(api.workouts.start, {});
    await other.mutation(api.workouts.addExercise, {
      workoutId: otherId,
      exerciseId: await exerciseId(t, 'bench-press'),
    });
    await logFirst(other, 450);
    await other.mutation(api.workouts.end, {
      workoutId: otherId,
      reason: 'terminate',
    });

    at(500);
    const terminatedId = await member.mutation(api.workouts.start, {
      routineId,
    });
    await logFirst(member, 560);
    await member.mutation(api.workouts.end, {
      workoutId: terminatedId,
      reason: 'terminate',
    });
    at(600);
    const activeId = await member.mutation(api.workouts.start, { routineId });

    const newest = await member.query(api.history.list, {
      paginationOpts: { numItems: 1, cursor: null },
    });
    expect(newest.page).toEqual([
      {
        workoutId: terminatedId,
        name: 'Upper A',
        startedAt: START + 500_000,
        finishedAt: START + 560_000,
        durationSeconds: 60,
        setsDone: 1,
      },
    ]);
    expect(newest.isDone).toBe(false);
    const older = await member.query(api.history.list, {
      paginationOpts: { numItems: 10, cursor: newest.continueCursor },
    });
    expect(older.page.map((workout) => workout.workoutId)).toEqual([firstId]);
    expect(older.page[0]?.setsDone).toBe(5);
    expect(older.isDone).toBe(true);
    for (const workoutId of [otherId, abandonedId, activeId]) {
      await expect(
        member.query(api.history.get, { workoutId })
      ).rejects.toThrow('NOT_FOUND');
    }
    await expect(
      other.query(api.history.get, { workoutId: firstId })
    ).rejects.toThrow('NOT_FOUND');
  });

  test('stats list only the member’s completed Workouts, oldest first, with Sets, Volume and Sets per Exercise', async () => {
    const { t, member, routineId } = await memberWithRoutine();
    const benchId = await exerciseId(t, 'bench-press');
    const rowId = await exerciseId(t, 'bent-over-row');
    const pullUpId = await exerciseId(t, 'pull-up');

    const fullId = await member.mutation(api.workouts.start, { routineId });
    for (const [index, set] of (await activeWorkout(member)).exercises
      .flatMap((exercise) => exercise.sets)
      .entries()) {
      at(30 * (index + 1));
      await member.mutation(api.workouts.completeSet, {
        setId: set._id,
        weightKg: 60,
        reps: 8,
      });
    }
    await member.mutation(api.workouts.end, {
      workoutId: fullId,
      reason: 'finish',
    });

    at(200);
    const abandonedId = await member.mutation(api.workouts.start, {
      routineId,
    });
    await member.mutation(api.workouts.end, {
      workoutId: abandonedId,
      reason: 'terminate',
    });

    const other = t.withIdentity({ subject: 'member-b' });
    at(300);
    const otherId = await other.mutation(api.workouts.start, {});
    await other.mutation(api.workouts.addExercise, {
      workoutId: otherId,
      exerciseId: benchId,
    });
    await logFirst(other, 350);
    await other.mutation(api.workouts.end, {
      workoutId: otherId,
      reason: 'terminate',
    });

    at(400);
    const earlyId = await member.mutation(api.workouts.start, { routineId });
    await member.mutation(api.workouts.addExercise, {
      workoutId: earlyId,
      exerciseId: pullUpId,
    });
    await logFirst(member, 450);
    const pullUp = (await activeWorkout(member)).exercises.find(
      (exercise) => exercise.exerciseId === pullUpId
    )?.sets[0];
    if (!pullUp) throw new Error('missing Pull-up Set');
    at(480);
    await member.mutation(api.workouts.completeSet, {
      setId: pullUp._id,
      weightKg: null,
      reps: 10,
    });
    await member.mutation(api.workouts.end, {
      workoutId: earlyId,
      reason: 'terminate',
    });
    at(600);
    await member.mutation(api.workouts.start, { routineId });

    const full = {
      workoutId: fullId,
      finishedAt: START + 150_000,
      sets: 5,
      volumeKg: 5 * 60 * 8,
      exercises: [
        { exerciseId: benchId, name: 'Bench Press', sets: 2 },
        { exerciseId: rowId, name: 'Bent-over Row', sets: 3 },
      ],
    };
    const early = {
      workoutId: earlyId,
      finishedAt: START + 480_000,
      sets: 2,
      volumeKg: 60 * 8,
      exercises: [
        { exerciseId: benchId, name: 'Bench Press', sets: 1 },
        { exerciseId: pullUpId, name: 'Pull-up', sets: 1 },
      ],
    };
    expect(await member.query(api.history.stats, { since: null })).toEqual([
      full,
      early,
    ]);
    expect(
      await member.query(api.history.stats, { since: START + 150_000 })
    ).toEqual([full, early]);
    expect(
      await member.query(api.history.stats, { since: START + 150_001 })
    ).toEqual([early]);
    expect(
      (await other.query(api.history.stats, { since: null })).map(
        (workout) => workout.workoutId
      )
    ).toEqual([otherId]);
  });

  test('stats require a signed-in member', async () => {
    const { t } = await memberWithRoutine();
    await expect(t.query(api.history.stats, { since: null })).rejects.toThrow(
      'NOT_AUTHENTICATED'
    );
  });

  test('stats keep the newest 500 Workouts, still oldest first', async () => {
    const { t, member } = await memberWithRoutine();
    const ids = await insertCompleted(
      t,
      Array.from({ length: 501 }, (_, index) => ({
        finishedAfter: index + 1,
        sets: 1,
      }))
    );
    const stats = await member.query(api.history.stats, { since: null });
    expect(stats.map((workout) => workout.workoutId)).toEqual(ids.slice(1));
  });

  test('stats stop before the Workout whose Sets would pass 24,000 Sets read', async () => {
    const { t, member } = await memberWithRoutine();
    const [, newestId] = await insertCompleted(t, [
      { finishedAfter: 1, sets: 1 },
      { finishedAfter: 2, sets: 24_000 },
    ]);
    expect(await member.query(api.history.stats, { since: null })).toEqual([
      expect.objectContaining({
        workoutId: newestId,
        sets: 24_000,
        volumeKg: 24_000 * 60,
      }),
    ]);
  }, 60_000);

  test('detail preserves Set types, Effort, saved targets and notes; Last time excludes itself and later Workouts; every Sets count is Working Sets only', async () => {
    const { member, routineId } = await memberWithRoutine();
    const routine = await member.query(api.routines.get, { routineId });
    const benchRoutine = routine?.exercises[0];
    if (!benchRoutine) throw new Error('missing Bench Press');
    await member.mutation(api.routines.updateExercise, {
      routineExerciseId: benchRoutine._id,
      repRangeMin: 4,
      repRangeMax: 8,
    });
    await member.mutation(api.routines.setTargetDuration, {
      routineId,
      targetDurationSeconds: 1200,
    });
    const earlierId = await member.mutation(api.workouts.start, { routineId });
    const earlierBench = (await activeWorkout(member)).exercises[0];
    if (!earlierBench) throw new Error('missing Bench Press');
    for (const [index, set] of earlierBench.sets.entries()) {
      at(30 + index * 100);
      await member.mutation(api.workouts.completeSet, {
        setId: set._id,
        weightKg: 60,
        reps: index === 0 ? 8 : 6,
        effort: { scale: 'RPE', value: 8 },
      });
    }
    await member.mutation(api.workouts.end, {
      workoutId: earlierId,
      reason: 'terminate',
    });

    at(3600);
    const workoutId = await member.mutation(api.workouts.start, { routineId });
    const [bench, row] = (await activeWorkout(member)).exercises;
    if (!bench || !row || !bench.sets[0] || !bench.sets[1] || !row.sets[0]) {
      throw new Error('missing planned Exercises or Sets');
    }
    await member.mutation(api.workouts.addSet, {
      workoutExerciseId: bench._id,
      type: 'warmup',
    });
    const warmup = (await activeWorkout(member)).exercises
      .find((exercise) => exercise._id === bench._id)
      ?.sets.find((set) => set.type === 'warmup');
    if (!warmup) throw new Error('missing Warm-up Set');
    const warmupId = warmup._id;
    await member.mutation(api.notes.save, {
      target: { kind: 'workout', workoutId },
      text: 'Felt strong today.',
    });
    await member.mutation(api.notes.save, {
      target: { kind: 'exercise', exerciseId: bench.exerciseId },
      text: 'Keep feet planted.',
    });
    await member.mutation(api.notes.save, {
      target: { kind: 'set', setId: bench.sets[1]._id },
      text: 'Last rep was slow.',
    });

    const logs = [
      {
        setId: warmupId,
        touch: 100,
        complete: 110,
        weightKg: 20,
        reps: 5,
        type: 'warmup',
      },
      {
        setId: bench.sets[0]._id,
        touch: 120,
        complete: 150,
        weightKg: 60,
        reps: 8,
        type: 'normal',
      },
      {
        setId: bench.sets[1]._id,
        touch: 220,
        complete: 250,
        weightKg: 60,
        reps: 7,
        type: 'failure',
      },
      {
        setId: row.sets[0]._id,
        touch: 320,
        complete: 350,
        weightKg: 40,
        reps: 5,
        type: 'dropset',
      },
    ] as const;
    for (const log of logs) {
      at(3600 + log.touch);
      await member.mutation(api.workouts.touchSet, { setId: log.setId });
      at(3600 + log.complete);
      await member.mutation(api.workouts.completeSet, {
        setId: log.setId,
        weightKg: log.weightKg,
        reps: log.reps,
        type: log.type,
        effort: { scale: 'RIR', value: 1.5 },
      });
    }
    await member.mutation(api.workouts.end, { workoutId, reason: 'terminate' });

    at(7200);
    const laterId = await member.mutation(api.workouts.start, { routineId });
    await logFirst(member, 7230);
    await member.mutation(api.workouts.end, {
      workoutId: laterId,
      reason: 'terminate',
    });

    const detail = await member.query(api.history.get, { workoutId });
    expect(detail).toMatchObject({
      workoutId,
      durationSeconds: 350,
      targetDurationSeconds: 1200,
      note: 'Felt strong today.',
      time: { workingSeconds: 100, restSeconds: 80, transitionSeconds: 70 },
    });
    // Warm-up and Dropset Sets are logged but count nowhere: list, detail,
    // stats and Workout Complete all see the normal and failure Sets only.
    expect(detail.setsDone).toBe(2);
    const listed = await member.query(api.history.list, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(
      listed.page.find((workout) => workout.workoutId === workoutId)?.setsDone
    ).toBe(2);
    expect(
      (await member.query(api.history.stats, { since: null })).find(
        (workout) => workout.workoutId === workoutId
      )
    ).toMatchObject({
      sets: 2,
      volumeKg: 60 * 8 + 60 * 7,
      exercises: [{ exerciseId: bench.exerciseId, sets: 2 }],
    });
    expect(
      (await member.query(api.workouts.get, { workoutId }))?.workingSets
    ).toEqual({ done: 2, total: 4 });
    const benchDetail = detail.exercises.find(
      (exercise) => exercise.workoutExerciseId === bench._id
    );
    expect(benchDetail).toMatchObject({
      standingNote: 'Keep feet planted.',
      targets: {
        repRange: { min: 4, max: 8 },
        lastTime: [
          { weightKg: 60, reps: 8, rpe: 8 },
          { weightKg: 60, reps: 6, rpe: 8 },
        ],
        suggested: [
          { weightKg: 60, reps: 8 },
          { weightKg: 60, reps: 7 },
        ],
        basis: { reason: 'rep-progression', edited: false, declined: false },
      },
      time: { workingSeconds: 70, restSeconds: 80, transitionSeconds: 0 },
    });
    expect(
      benchDetail?.sets.find((set) => set.setId === bench.sets[1]?._id)
    ).toMatchObject({
      type: 'failure',
      rpe: 8.5,
      note: 'Last rep was slow.',
      completedAt: START + 3850_000,
    });
    expect(benchDetail?.sets.find((set) => set.setId === warmupId)?.type).toBe(
      'warmup'
    );
    expect(detail.exercises[1]?.sets[0]).toMatchObject({
      type: 'dropset',
      rpe: 8.5,
    });
    expect(detail.exercises[1]?.sets[1]?.completedAt).toBeNull();
    for (const key of [
      'workingSeconds',
      'restSeconds',
      'transitionSeconds',
    ] as const) {
      expect(
        detail.exercises.reduce(
          (sum, exercise) => sum + (exercise.time?.[key] ?? 0),
          0
        )
      ).toBe(detail.time[key]);
    }
    expect(
      (await member.query(api.history.get, { workoutId: earlierId }))
        .exercises[0]?.targets.lastTime
    ).toBeNull();
  });

  test('per-Exercise rounded durations reconcile fractional seconds across Exercises', async () => {
    const { member, routineId } = await memberWithRoutine();
    const workoutId = await member.mutation(api.workouts.start, { routineId });
    const [bench, row] = (await activeWorkout(member)).exercises;
    const first = bench?.sets[0];
    const second = row?.sets[0];
    if (!first || !second) throw new Error('missing planned Sets');
    at(10);
    await member.mutation(api.workouts.touchSet, { setId: first._id });
    at(10.4);
    await member.mutation(api.workouts.completeSet, {
      setId: first._id,
      weightKg: 60,
      reps: 8,
    });
    at(30);
    await member.mutation(api.workouts.touchSet, { setId: second._id });
    at(30.4);
    await member.mutation(api.workouts.completeSet, {
      setId: second._id,
      weightKg: 40,
      reps: 8,
    });
    await member.mutation(api.workouts.end, { workoutId, reason: 'terminate' });
    const detail = await member.query(api.history.get, { workoutId });
    expect(detail.time.workingSeconds).toBe(1);
    expect(
      detail.exercises.reduce(
        (sum, exercise) => sum + (exercise.time?.workingSeconds ?? 0),
        0
      )
    ).toBe(1);
    expect(detail.exercises[1]?.time?.transitionSeconds).toBe(20);
  });

  test('simultaneously logged Sets keep whole and per-Exercise timing in the same order', async () => {
    const { t, member } = await memberWithRoutine();
    const workoutId = await member.mutation(api.workouts.start, {});
    for (const slug of ['cable-row', 'bench-press']) {
      await member.mutation(api.workouts.addExercise, {
        workoutId,
        exerciseId: await exerciseId(t, slug),
      });
    }
    const [cable, bench] = (await activeWorkout(member)).exercises;
    const first = cable?.sets[0];
    const second = bench?.sets[0];
    if (!first || !second) throw new Error('missing planned Sets');
    at(10);
    await member.mutation(api.workouts.touchSet, { setId: first._id });
    at(30);
    await member.mutation(api.workouts.touchSet, { setId: second._id });
    at(50);
    for (const setId of [first._id, second._id]) {
      await member.mutation(api.workouts.completeSet, {
        setId,
        weightKg: 40,
        reps: 8,
      });
    }
    await member.mutation(api.workouts.end, { workoutId, reason: 'terminate' });
    const detail = await member.query(api.history.get, { workoutId });
    expect(detail.time.workingSeconds).toBe(40);
    expect(detail.exercises[0]?.time?.workingSeconds).toBe(40);
    expect(detail.exercises[1]?.time?.workingSeconds).toBe(0);
    expect(
      detail.exercises.reduce(
        (sum, exercise) => sum + (exercise.time?.workingSeconds ?? 0),
        0
      )
    ).toBe(detail.time.workingSeconds);
  });
});
