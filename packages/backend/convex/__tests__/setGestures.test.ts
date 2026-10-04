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

describe('Set row actions', () => {
  test('Duplicate adds an unlogged Set right after with the same type, weight and reps', async () => {
    const { member, bench } = await startedBench();
    const [first] = bench.sets;
    await member.mutation(api.workouts.completeSet, {
      setId: first?._id as Id<'sets'>,
      weightKg: 60,
      reps: 8,
      type: 'failure',
      effort: { scale: 'RPE', value: 9 },
    });

    await member.mutation(api.workouts.duplicateSet, {
      setId: first?._id as Id<'sets'>,
    });

    const sets = (await activeWorkout(member)).exercises[0]?.sets;
    expect(sets).toHaveLength(3);
    expect(sets?.[1]).toMatchObject({
      type: 'failure',
      weightKg: 60,
      reps: 8,
      rpe: null,
      completedAt: null,
    });
    expect(sets?.[2]?._id).toBe(bench.sets[1]?._id);
  });

  test('Delete removes an unlogged Set', async () => {
    const { member, bench } = await startedBench();

    await member.mutation(api.workouts.deleteSet, {
      setId: bench.sets[0]?._id as Id<'sets'>,
    });

    const workout = await activeWorkout(member);
    expect(workout.exercises[0]?.sets.map((set) => set._id)).toEqual([
      bench.sets[1]?._id,
    ]);
    expect(workout.progress.total).toBe(4);
  });

  test('a logged Set can’t be deleted', async () => {
    const { member, bench } = await startedBench();
    const setId = bench.sets[0]?._id as Id<'sets'>;
    await member.mutation(api.workouts.completeSet, {
      setId,
      weightKg: 60,
      reps: 8,
    });

    await expect(
      member.mutation(api.workouts.deleteSet, { setId })
    ).rejects.toThrow('SET_LOGGED');
    expect((await activeWorkout(member)).exercises[0]?.sets).toHaveLength(2);
  });
});

describe('swipe hint', () => {
  test('shows until dismissed, then never again for that identity', async () => {
    const { t, member } = await memberWithRoutine();
    expect(
      (await member.query(api.memberSettings.get, {}))?.swipeHintDismissed
    ).toBe(false);

    await member.mutation(api.memberSettings.update, {
      swipeHintDismissed: true,
    });

    expect(
      (await member.query(api.memberSettings.get, {}))?.swipeHintDismissed
    ).toBe(true);
    const other = t.withIdentity({ subject: 'member-b' });
    expect(
      (await other.query(api.memberSettings.get, {}))?.swipeHintDismissed
    ).toBe(false);
  });
});
