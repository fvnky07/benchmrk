import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import {
  createTest,
  type TestBackend,
  type TestMember,
} from './harness.testing';
import {
  activeWorkout,
  exerciseId,
  START,
  useWorkoutClock,
} from './workoutFixtures.testing';

beforeEach(useWorkoutClock);

afterEach(() => {
  vi.useRealTimers();
});

const BLOCK_REST_SECONDS = 90;

/**
 * "Push Pull": Bench Press × 3 and Bent-over Row × 2 as Alternating sets with
 * 90 s rest after each round, then Squat × 2 on its own.
 */
async function alternatingRoutine() {
  const t = createTest();
  await t.mutation(internal.init.seed, {});
  const member = t.withIdentity({ subject: 'member-a' });
  const routineId = await member.mutation(api.routines.create, {
    name: 'Push Pull',
  });
  const add = async (slug: string, targetSets: number) => {
    const routineExerciseId = await member.mutation(api.routines.addExercise, {
      routineId,
      exerciseId: await exerciseId(t, slug),
    });
    await member.mutation(api.routines.updateExercise, {
      routineExerciseId,
      targetSets,
    });
    return routineExerciseId;
  };
  const bench = await add('bench-press', 3);
  const row = await add('bent-over-row', 2);
  await add('squat', 2);
  await member.mutation(api.routines.linkExercises, {
    routineExerciseId: row,
    withRoutineExerciseId: bench,
  });
  const routine = await member.query(api.routines.get, { routineId });
  await member.mutation(api.routines.setBlockRest, {
    routineBlockId: routine?.blocks[0]?._id as Id<'routineBlocks'>,
    seconds: BLOCK_REST_SECONDS,
  });
  return { t, member, routineId };
}

async function startAlternating() {
  const fixture = await alternatingRoutine();
  const workoutId = await fixture.member.mutation(api.workouts.start, {
    routineId: fixture.routineId,
  });
  return { ...fixture, workoutId };
}

async function exercises(member: TestMember) {
  const [bench, row, squat] = (await activeWorkout(member)).exercises;
  if (!bench || !row || !squat) throw new Error('missing Exercises');
  return { bench, row, squat };
}

/** Logs the next unlogged Set of an Exercise. */
async function logNext(member: TestMember, workoutExerciseId: string) {
  const exercise = (await activeWorkout(member)).exercises.find(
    (item) => item._id === workoutExerciseId
  );
  const set = exercise?.sets.find((item) => item.completedAt === null);
  if (!set) throw new Error('no Set left');
  vi.advanceTimersByTime(30_000);
  return member.mutation(api.workouts.completeSet, {
    setId: set._id,
    weightKg: 60,
    reps: 8,
  });
}

async function storedBlock(t: TestBackend, workoutId: Id<'workouts'>) {
  const [block] = await t.run((ctx) =>
    ctx.db
      .query('workoutBlocks')
      .withIndex('by_workout', (q) => q.eq('workoutId', workoutId))
      .collect()
  );
  if (!block) throw new Error('no block');
  return block;
}

describe('Alternating sets rounds', () => {
  test('uneven Set counts give rounds of 2, 2, then 1, with rest only after each round and none after the final Set', async () => {
    const { t, member, workoutId } = await startAlternating();
    const { bench, row, squat } = await exercises(member);

    const first = await logNext(member, bench._id);
    expect(first).toMatchObject({ next: row._id, roundCompleted: null });
    expect((await activeWorkout(member)).rest).toBeNull();

    const roundOne = await logNext(member, row._id);
    expect(roundOne).toMatchObject({ next: bench._id, roundCompleted: 1 });
    expect((await activeWorkout(member)).rest?.plannedSeconds).toBe(
      BLOCK_REST_SECONDS
    );

    await logNext(member, bench._id);
    expect((await logNext(member, row._id)).roundCompleted).toBe(2);
    const roundThree = await logNext(member, bench._id);
    expect(roundThree).toMatchObject({ next: squat._id, roundCompleted: 3 });

    const block = await storedBlock(t, workoutId);
    expect(block.completedRounds.map((round) => round.required.length)).toEqual(
      [2, 2, 1]
    );
    expect(block.completedRounds.map((round) => round.completedAt)).toEqual([
      START + 60_000,
      START + 120_000,
      START + 150_000,
    ]);

    await logNext(member, squat._id);
    const last = await logNext(member, squat._id);
    expect(last.next).toBeNull();
    expect((await activeWorkout(member)).rest).toBeNull();
  });

  test('with auto-advance off, focus stays on the Exercise until the round completes', async () => {
    const { member } = await startAlternating();
    await member.mutation(api.memberSettings.update, { autoAdvance: false });
    const { bench, row } = await exercises(member);

    expect((await logNext(member, bench._id)).next).toBe(bench._id);
    expect((await logNext(member, row._id)).next).toBe(bench._id);
  });

  test('unchecking a Set takes back its round credit but keeps the rest that started', async () => {
    const { t, member, workoutId } = await startAlternating();
    const { bench, row } = await exercises(member);
    await logNext(member, bench._id);
    await logNext(member, row._id);

    await member.mutation(api.workouts.uncompleteSet, {
      setId: (await exercises(member)).row.sets[0]?._id as Id<'sets'>,
    });

    const block = await storedBlock(t, workoutId);
    expect(block.completedRounds).toEqual([]);
    expect(block.round).toMatchObject({ number: 1, done: [bench._id] });
    expect((await activeWorkout(member)).rest?.plannedSeconds).toBe(
      BLOCK_REST_SECONDS
    );
  });
  test('unchecking an earlier Set reconciles credited rounds with the newer open round', async () => {
    const { member } = await startAlternating();
    const { bench, row } = await exercises(member);
    await logNext(member, bench._id);
    await logNext(member, row._id);
    await logNext(member, bench._id);
    await member.mutation(api.workouts.uncompleteSet, {
      setId: row.sets[0]?._id as Id<'sets'>,
    });
    const block = (await activeWorkout(member)).blocks[0];
    expect(block?.roundsCompleted).toBe(0);
    expect(block?.round).toMatchObject({
      number: 1,
      required: [bench._id, row._id],
      done: [bench._id],
    });
    expect((await logNext(member, row._id)).roundCompleted).toBe(1);
    expect((await logNext(member, row._id)).roundCompleted).toBe(2);
    expect((await activeWorkout(member)).blocks[0]?.roundsCompleted).toBe(2);
  });
});

describe('regrouping mid-Workout', () => {
  test('a linked Exercise joins the open round as pending; logged Sets and credited rounds stay', async () => {
    const { member } = await startAlternating();
    const { bench, row, squat } = await exercises(member);
    await logNext(member, bench._id);
    await logNext(member, row._id);
    await logNext(member, bench._id);

    await member.mutation(api.workoutStructure.linkExercise, {
      workoutExerciseId: squat._id,
      withWorkoutExerciseId: bench._id,
    });

    expect((await activeWorkout(member)).rest).toBeNull();
    const afterRow = await logNext(member, row._id);
    expect(afterRow).toMatchObject({ next: squat._id, roundCompleted: null });
    expect((await activeWorkout(member)).rest).toBeNull();
    expect((await logNext(member, squat._id)).roundCompleted).toBe(2);

    const workout = await activeWorkout(member);
    expect(workout.blocks[0]?.roundsCompleted).toBe(2);
    expect(workout.progress.done).toBe(5);
  });

  test('an unlinked Exercise leaves the open round, which is credited without starting rest', async () => {
    const { t, member, workoutId } = await startAlternating();
    const { bench, row, squat } = await exercises(member);
    await member.mutation(api.workoutStructure.linkExercise, {
      workoutExerciseId: squat._id,
      withWorkoutExerciseId: bench._id,
    });
    await logNext(member, bench._id);
    await logNext(member, row._id);

    await member.mutation(api.workoutStructure.unlinkExercise, {
      workoutExerciseId: squat._id,
    });

    expect((await activeWorkout(member)).rest).toBeNull();
    const block = await storedBlock(t, workoutId);
    expect(block.round).toBeUndefined();
    expect(block.completedRounds.map((round) => round.required)).toEqual([
      [bench._id, row._id],
    ]);
    expect((await logNext(member, squat._id)).roundCompleted).toBeNull();
    expect((await activeWorkout(member)).rest?.plannedSeconds).toBe(60);
  });

  test('Skip for now defers an Exercise without logging and keeps the round open', async () => {
    const { member } = await startAlternating();
    const { bench, row } = await exercises(member);

    const skipped = await member.mutation(api.workouts.skipForNow, {
      workoutExerciseId: bench._id,
    });
    expect(skipped.next).toBe(row._id);
    expect((await activeWorkout(member)).blocks[0]?.round).toMatchObject({
      skipped: [bench._id],
      done: [],
    });

    const afterRow = await logNext(member, row._id);
    expect(afterRow).toMatchObject({ next: bench._id, roundCompleted: null });
    expect((await activeWorkout(member)).rest).toBeNull();
    expect((await logNext(member, bench._id)).roundCompleted).toBe(1);
  });

  test('finishing leaves an open round incomplete and invents no Set or rest', async () => {
    const { t, member, workoutId } = await startAlternating();
    const { bench } = await exercises(member);
    await logNext(member, bench._id);

    await member.mutation(api.workouts.end, {
      workoutId,
      reason: 'terminate',
    });

    const block = await storedBlock(t, workoutId);
    expect(block.round).toBeUndefined();
    expect(block.completedRounds).toEqual([]);
    const workout = await member.query(api.workouts.get, { workoutId });
    expect(workout?.rest).toBeNull();
    expect(
      workout?.exercises.flatMap((item) =>
        item.sets.filter((set) => set.completedAt !== null)
      )
    ).toHaveLength(1);
  });

  test('block changes show in Save changes to Routine and reach the Routine only when saved', async () => {
    const { member, routineId, workoutId } = await startAlternating();
    const { bench, row, squat } = await exercises(member);
    await member.mutation(api.workoutStructure.unlinkExercise, {
      workoutExerciseId: row._id,
    });
    await member.mutation(api.workoutStructure.linkExercise, {
      workoutExerciseId: squat._id,
      withWorkoutExerciseId: bench._id,
    });
    await logNext(member, bench._id);
    await member.mutation(api.workouts.end, { workoutId, reason: 'terminate' });

    const shown = await member.query(api.workoutStructure.getChanges, {
      workoutId,
    });
    expect(shown?.changes).toEqual(
      expect.arrayContaining([
        { kind: 'linked', exercises: ['Bench Press', 'Squat'] },
        { kind: 'unlinked', exercises: ['Bench Press', 'Bent-over Row'] },
      ])
    );
    const links = async () =>
      (await member.query(api.routines.get, { routineId }))?.exercises.map(
        ({ name, linkedToNext }) => ({ name, linkedToNext })
      );
    expect(await links()).toEqual([
      { name: 'Bench Press', linkedToNext: true },
      { name: 'Bent-over Row', linkedToNext: false },
      { name: 'Squat', linkedToNext: false },
    ]);

    await member.mutation(api.workoutStructure.saveToRoutine, { workoutId });

    expect(await links()).toEqual([
      { name: 'Bench Press', linkedToNext: true },
      { name: 'Squat', linkedToNext: false },
      { name: 'Bent-over Row', linkedToNext: false },
    ]);
  });
});
