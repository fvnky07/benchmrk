import { vi } from 'vitest';

import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import {
  createTest,
  type TestBackend,
  type TestMember,
} from './harness.testing';

export const START = new Date('2026-10-01T08:00:00Z').getTime();

/** Fake timers pinned to START; pair with `vi.useRealTimers()` after each test. */
export function useWorkoutClock() {
  vi.useFakeTimers();
  vi.setSystemTime(START);
}

export async function exerciseId(t: TestBackend, slug: string) {
  const exercise = await t.run((ctx) =>
    ctx.db
      .query('exercises')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
  );
  if (!exercise) throw new Error(`missing ${slug}`);
  return exercise._id as Id<'exercises'>;
}

/** A member with the "Upper A" Routine: Bench Press × 2, Bent-over Row × 3. */
export async function memberWithRoutine() {
  const t = createTest();
  await t.mutation(internal.init.seed, {});
  const member = t.withIdentity({ subject: 'member-a' });
  const routineId = await member.mutation(api.routines.create, {
    name: 'Upper A',
  });
  const benchId = await member.mutation(api.routines.addExercise, {
    routineId,
    exerciseId: await exerciseId(t, 'bench-press'),
  });
  await member.mutation(api.routines.updateExercise, {
    routineExerciseId: benchId,
    targetSets: 2,
  });
  await member.mutation(api.routines.addExercise, {
    routineId,
    exerciseId: await exerciseId(t, 'bent-over-row'),
  });
  return { t, member, routineId };
}

export async function activeWorkout(member: TestMember) {
  const workout = await member.query(api.workouts.getActive, {});
  if (!workout) throw new Error('no active Workout');
  return workout;
}
