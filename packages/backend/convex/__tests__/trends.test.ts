import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import type { TestMember } from './harness.testing';
import {
  activeWorkout,
  exerciseId,
  memberWithRoutine,
  START,
  useWorkoutClock,
} from './workoutFixtures.testing';

beforeEach(useWorkoutClock);
afterEach(() => vi.useRealTimers());

async function measuredWorkout(
  member: TestMember,
  routineId: Id<'routines'>,
  day: number,
  timing: {
    firstTouch: number;
    firstLog: number;
    secondTouch: number;
    secondLog: number;
    rowTouch: number;
    rowLog: number;
    plannedSeconds: number;
  }
) {
  const startedAt = START + day * 86_400_000;
  vi.setSystemTime(startedAt);
  const workoutId = await member.mutation(api.workouts.start, { routineId });
  const [bench, row] = (await activeWorkout(member)).exercises;
  if (!bench || !row || !bench.sets[0] || !bench.sets[1] || !row.sets[0]) {
    throw new Error('The Routine must contain Bench Press × 2 and a Row');
  }
  await member.mutation(api.workouts.setExerciseRest, {
    workoutExerciseId: bench._id,
    seconds: timing.plannedSeconds,
  });
  for (const [setId, touch, log] of [
    [bench.sets[0]._id, timing.firstTouch, timing.firstLog],
    [bench.sets[1]._id, timing.secondTouch, timing.secondLog],
    [row.sets[0]._id, timing.rowTouch, timing.rowLog],
  ] as const) {
    vi.setSystemTime(startedAt + touch * 1000);
    await member.mutation(api.workouts.touchSet, { setId });
    vi.setSystemTime(startedAt + log * 1000);
    await member.mutation(api.workouts.completeSet, {
      setId,
      weightKg: 50,
      reps: 5,
    });
  }
  await member.mutation(api.workouts.end, { workoutId, reason: 'terminate' });
  return workoutId;
}

async function trendHistory() {
  const { t, member, routineId } = await memberWithRoutine();
  const benchId = await exerciseId(t, 'bench-press');
  await measuredWorkout(member, routineId, 0, {
    firstTouch: 20,
    firstLog: 50,
    secondTouch: 120,
    secondLog: 150,
    rowTouch: 210,
    rowLog: 240,
    plannedSeconds: 60,
  });
  await measuredWorkout(member, routineId, 1, {
    firstTouch: 10,
    firstLog: 40,
    secondTouch: 90,
    secondLog: 130,
    rowTouch: 220,
    rowLog: 250,
    plannedSeconds: 120,
  });

  vi.setSystemTime(START + 2 * 86_400_000);
  const abandonedId = await member.mutation(api.workouts.start, { routineId });
  await member.mutation(api.workouts.end, {
    workoutId: abandonedId,
    reason: 'terminate',
  });

  const other = t.withIdentity({ subject: 'member-b' });
  const otherRoutineId = await other.mutation(api.routines.create, {
    name: 'Another Routine',
  });
  for (const id of [benchId, await exerciseId(t, 'bent-over-row')]) {
    await other.mutation(api.routines.addExercise, {
      routineId: otherRoutineId,
      exerciseId: id,
    });
  }
  await measuredWorkout(other, otherRoutineId, 3, {
    firstTouch: 10,
    firstLog: 80,
    secondTouch: 400,
    secondLog: 450,
    rowTouch: 700,
    rowLog: 750,
    plannedSeconds: 300,
  });

  vi.setSystemTime(START + 4 * 86_400_000);
  await member.mutation(api.workouts.start, { routineId });
  const first = (await activeWorkout(member)).exercises[0]?.sets[0];
  if (!first) throw new Error('The active Workout must have a Set');
  vi.setSystemTime(START + 4 * 86_400_000 + 60_000);
  await member.mutation(api.workouts.completeSet, {
    setId: first._id,
    weightKg: 50,
    reps: 5,
  });
  return { t, member, routineId, benchId, otherRoutineId };
}

describe('Workout trends', () => {
  test('Exercise trends use only the member’s completed Workouts, oldest first, with per-Exercise time', async () => {
    const { member, benchId } = await trendHistory();
    expect(
      await member.query(api.trends.forExercise, { exerciseId: benchId })
    ).toEqual({
      duration: [
        { label: '1 Oct', value: 130, at: START },
        { label: '2 Oct', value: 120, at: START + 86_400_000 },
      ],
      rest: {
        points: [
          { label: '1 Oct', value: 70, at: START },
          { label: '2 Oct', value: 50, at: START + 86_400_000 },
        ],
        plannedSeconds: 120,
      },
    });
  });

  test('Routine trends use completed Workouts, wall-clock duration, and whole-Workout rest', async () => {
    const { member, routineId } = await trendHistory();
    expect(await member.query(api.trends.forRoutine, { routineId })).toEqual({
      duration: [
        { label: '1 Oct', value: 240, at: START },
        { label: '2 Oct', value: 250, at: START + 86_400_000 },
      ],
      rest: {
        points: [
          { label: '1 Oct', value: 70, at: START },
          { label: '2 Oct', value: 50, at: START + 86_400_000 },
        ],
        plannedSeconds: 120,
      },
    });
  });

  test('another member’s Routine cannot be queried', async () => {
    const { member, otherRoutineId } = await trendHistory();
    await expect(
      member.query(api.trends.forRoutine, { routineId: otherRoutineId })
    ).rejects.toThrow('NOT_FOUND');
  });

  test('both queries return only the latest 12 completed Workouts', async () => {
    const { t, member, routineId } = await memberWithRoutine();
    const benchId = await exerciseId(t, 'bench-press');
    for (let day = 0; day < 13; day += 1) {
      await measuredWorkout(member, routineId, day, {
        firstTouch: 20,
        firstLog: 50,
        secondTouch: 120,
        secondLog: 150,
        rowTouch: 210,
        rowLog: 240,
        plannedSeconds: 60,
      });
    }
    const expectedDates = Array.from({ length: 12 }, (_, index) => ({
      label: `${index + 2} Oct`,
      at: START + (index + 1) * 86_400_000,
    }));
    const exercise = await member.query(api.trends.forExercise, {
      exerciseId: benchId,
    });
    const routine = await member.query(api.trends.forRoutine, { routineId });
    expect(exercise.duration).toEqual(
      expectedDates.map((date) => ({ ...date, value: 130 }))
    );
    expect(routine.duration).toEqual(
      expectedDates.map((date) => ({ ...date, value: 240 }))
    );
    for (const trends of [exercise, routine]) {
      expect(trends.rest).toEqual({
        points: expectedDates.map((date) => ({ ...date, value: 70 })),
        plannedSeconds: 60,
      });
    }
  });

  test('unmeasured rest is omitted without losing duration or the newest measured plan', async () => {
    const { member, routineId, benchId } = await trendHistory();
    const active = await activeWorkout(member);
    await member.mutation(api.workouts.end, {
      workoutId: active._id,
      reason: 'terminate',
    });
    const exercise = await member.query(api.trends.forExercise, {
      exerciseId: benchId,
    });
    const routine = await member.query(api.trends.forRoutine, { routineId });
    expect(exercise.duration).toEqual([
      { label: '1 Oct', value: 130, at: START },
      { label: '2 Oct', value: 120, at: START + 86_400_000 },
      { label: '5 Oct', value: 0, at: START + 4 * 86_400_000 },
    ]);
    expect(routine.duration).toEqual([
      { label: '1 Oct', value: 240, at: START },
      { label: '2 Oct', value: 250, at: START + 86_400_000 },
      { label: '5 Oct', value: 60, at: START + 4 * 86_400_000 },
    ]);
    for (const trends of [exercise, routine]) {
      expect(trends.rest).toEqual({
        points: [
          { label: '1 Oct', value: 70, at: START },
          { label: '2 Oct', value: 50, at: START + 86_400_000 },
        ],
        plannedSeconds: 120,
      });
    }
  });

  test('repeated instances of an Exercise sum duration and weight each measured rest equally', async () => {
    const { t, member, routineId } = await memberWithRoutine();
    const benchId = await exerciseId(t, 'bench-press');
    const repeatedId = await member.mutation(api.routines.addExercise, {
      routineId,
      exerciseId: benchId,
    });
    await member.mutation(api.routines.updateExercise, {
      routineExerciseId: repeatedId,
      plannedRestSeconds: 120,
    });
    const workoutId = await member.mutation(api.workouts.start, { routineId });
    const [firstBench, row, secondBench] = (await activeWorkout(member))
      .exercises;
    if (!firstBench || !row || !secondBench) {
      throw new Error('The Routine must contain Bench Press, Row, Bench Press');
    }
    for (const [exercise, touches, completions] of [
      [firstBench, [10, 60], [40, 90]],
      [row, [160], [190]],
      [secondBench, [260, 380, 500], [290, 410, 530]],
    ] as const) {
      for (const [index, completedAt] of completions.entries()) {
        const set = exercise.sets[index];
        const touchedAt = touches[index];
        if (!set || touchedAt === undefined) {
          throw new Error('The Workout must have every planned Set');
        }
        vi.setSystemTime(START + touchedAt * 1000);
        await member.mutation(api.workouts.touchSet, { setId: set._id });
        vi.setSystemTime(START + completedAt * 1000);
        await member.mutation(api.workouts.completeSet, {
          setId: set._id,
          weightKg: 50,
          reps: 5,
        });
      }
    }
    await member.mutation(api.workouts.end, { workoutId, reason: 'terminate' });
    expect(
      await member.query(api.trends.forExercise, { exerciseId: benchId })
    ).toEqual({
      duration: [{ label: '1 Oct', value: 420, at: START }],
      rest: {
        points: [{ label: '1 Oct', value: 67, at: START }],
        plannedSeconds: 100,
      },
    });
  });

  test('an Exercise and Routine without completed Workouts have no measured plan', async () => {
    const { t, member, routineId } = await memberWithRoutine();
    const benchId = await exerciseId(t, 'bench-press');
    const empty = { duration: [], rest: { points: [], plannedSeconds: null } };
    expect(
      await member.query(api.trends.forExercise, { exerciseId: benchId })
    ).toEqual(empty);
    expect(await member.query(api.trends.forRoutine, { routineId })).toEqual(
      empty
    );
  });
});
