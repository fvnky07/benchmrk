import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import {
  activeWorkout,
  memberWithRoutine,
  useWorkoutClock,
} from './workoutFixtures.testing';

beforeEach(useWorkoutClock);

afterEach(() => {
  vi.useRealTimers();
});

async function startedBench() {
  const fixture = await memberWithRoutine();
  await fixture.member.mutation(api.workouts.start, {
    routineId: fixture.routineId,
  });
  const bench = (await activeWorkout(fixture.member)).exercises[0];
  if (!bench) throw new Error('no Bench Press');
  return { ...fixture, bench };
}

describe('Effort rating', () => {
  test('is stored as RPE whichever scale it was entered in', async () => {
    const { member, bench } = await startedBench();
    const [first, second] = bench.sets;

    await member.mutation(api.workouts.completeSet, {
      setId: first?._id as Id<'sets'>,
      weightKg: 60,
      reps: 8,
      effort: { scale: 'RIR', value: 2 },
    });
    await member.mutation(api.workouts.updateSet, {
      setId: second?._id as Id<'sets'>,
      effort: { scale: 'RPE', value: 9.5 },
    });

    const sets = (await activeWorkout(member)).exercises[0]?.sets;
    expect(sets?.map((set) => set.rpe)).toEqual([8, 9.5]);
  });

  test('is optional and can be cleared', async () => {
    const { member, bench } = await startedBench();
    const setId = bench.sets[0]?._id as Id<'sets'>;
    await member.mutation(api.workouts.updateSet, {
      setId,
      effort: { scale: 'RPE', value: 7 },
    });

    await member.mutation(api.workouts.updateSet, { setId, effort: null });

    expect((await activeWorkout(member)).exercises[0]?.sets[0]?.rpe).toBeNull();
  });

  test('moves in 0.5 steps within the scale', async () => {
    const { member, bench } = await startedBench();
    const setId = bench.sets[0]?._id as Id<'sets'>;

    for (const effort of [
      { scale: 'RPE', value: 8.3 },
      { scale: 'RPE', value: 10.5 },
      { scale: 'RPE', value: 0.5 },
      { scale: 'RIR', value: -1 },
      { scale: 'RIR', value: 1.25 },
    ] as const) {
      await expect(
        member.mutation(api.workouts.updateSet, { setId, effort })
      ).rejects.toThrow('INVALID_EFFORT');
    }
  });
});

describe('Set types', () => {
  test('persist on the Set', async () => {
    const { member, bench } = await startedBench();
    const [first, second] = bench.sets;

    await member.mutation(api.workouts.updateSet, {
      setId: first?._id as Id<'sets'>,
      type: 'failure',
    });
    await member.mutation(api.workouts.completeSet, {
      setId: second?._id as Id<'sets'>,
      weightKg: 50,
      reps: 12,
      type: 'dropset',
    });

    const sets = (await activeWorkout(member)).exercises[0]?.sets;
    expect(sets?.map((set) => set.type)).toEqual(['failure', 'dropset']);
  });

  test('a Warm-up Set goes before the Working Sets and never counts toward progress', async () => {
    const { member, bench } = await startedBench();
    const before = (await activeWorkout(member)).progress;

    await member.mutation(api.workouts.addSet, {
      workoutExerciseId: bench._id,
      type: 'warmup',
    });
    const workout = await activeWorkout(member);
    const warmup = workout.exercises[0]?.sets[0];
    await member.mutation(api.workouts.completeSet, {
      setId: warmup?._id as Id<'sets'>,
      weightKg: 20,
      reps: 10,
    });

    expect(workout.exercises[0]?.sets.map((set) => set.type)).toEqual([
      'warmup',
      'normal',
      'normal',
    ]);
    expect((await activeWorkout(member)).progress).toEqual(before);
  });
});
