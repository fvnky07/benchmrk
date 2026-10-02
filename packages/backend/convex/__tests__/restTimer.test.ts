import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import {
  activeWorkout,
  memberWithRoutine,
  START,
  useWorkoutClock,
} from './workoutFixtures.testing';

beforeEach(useWorkoutClock);

afterEach(() => {
  vi.useRealTimers();
});

async function started() {
  const fixture = await memberWithRoutine();
  const workoutId = await fixture.member.mutation(api.workouts.start, {
    routineId: fixture.routineId,
  });
  const workout = await activeWorkout(fixture.member);
  const setId = (exercise: number, set: number) =>
    workout.exercises[exercise]?.sets[set]?._id as Id<'sets'>;
  return { ...fixture, workoutId, workout, setId };
}

describe('rest timer', () => {
  test('completing a Set starts the Exercise’s planned rest, else the member default', async () => {
    const { member, workout, setId } = await started();
    await member.mutation(api.memberSettings.update, {
      defaultRestSeconds: 90,
    });
    await member.mutation(api.workouts.setExerciseRest, {
      workoutExerciseId: workout.exercises[1]?._id as Id<'workoutExercises'>,
      seconds: 150,
    });

    await member.mutation(api.workouts.completeSet, {
      setId: setId(0, 0),
      weightKg: 60,
      reps: 8,
    });
    expect((await activeWorkout(member)).rest).toEqual({
      startedAt: START,
      plannedSeconds: 90,
      adjustedSeconds: 0,
      endsAt: START + 90_000,
    });

    vi.setSystemTime(START + 30_000);
    await member.mutation(api.workouts.completeSet, {
      setId: setId(1, 0),
      weightKg: 50,
      reps: 10,
    });
    expect((await activeWorkout(member)).rest).toMatchObject({
      startedAt: START + 30_000,
      plannedSeconds: 150,
    });
  });

  test('never starts after the final planned Set of the Workout', async () => {
    const { member, setId } = await started();
    for (const [exercise, set] of [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ] as const) {
      await member.mutation(api.workouts.completeSet, {
        setId: setId(exercise, set),
        weightKg: 50,
        reps: 10,
      });
    }
    expect((await activeWorkout(member)).rest).not.toBeNull();

    await member.mutation(api.workouts.completeSet, {
      setId: setId(1, 2),
      weightKg: 50,
      reps: 10,
    });

    expect((await activeWorkout(member)).rest).toBeNull();
  });

  test('adjusting moves the end by 15 s but never before now', async () => {
    const { member, workoutId, setId } = await started();
    await member.mutation(api.workouts.completeSet, {
      setId: setId(0, 0),
      weightKg: 60,
      reps: 8,
    });

    await member.mutation(api.workouts.adjustRest, { workoutId, seconds: 15 });
    expect((await activeWorkout(member)).rest?.endsAt).toBe(START + 75_000);

    vi.setSystemTime(START + 70_000);
    await member.mutation(api.workouts.adjustRest, { workoutId, seconds: -15 });
    expect((await activeWorkout(member)).rest?.endsAt).toBe(START + 70_000);
  });

  test('skip ends rest and reset restarts the planned rest', async () => {
    const { member, workoutId, setId } = await started();
    await member.mutation(api.workouts.completeSet, {
      setId: setId(0, 0),
      weightKg: 60,
      reps: 8,
    });
    await member.mutation(api.workouts.adjustRest, { workoutId, seconds: 15 });

    vi.setSystemTime(START + 40_000);
    await member.mutation(api.workouts.resetRest, { workoutId });
    expect((await activeWorkout(member)).rest).toMatchObject({
      startedAt: START + 40_000,
      adjustedSeconds: 0,
      endsAt: START + 100_000,
    });

    await member.mutation(api.workouts.skipRest, { workoutId });
    expect((await activeWorkout(member)).rest).toBeNull();
    await expect(
      member.mutation(api.workouts.adjustRest, { workoutId, seconds: 15 })
    ).rejects.toThrow('NOT_RESTING');
  });
});
