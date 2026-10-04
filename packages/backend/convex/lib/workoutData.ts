// Reading and ownership checks for Workouts, shared by the Workout, structure
// and Group modules.
import { ConvexError } from 'convex/values';

import type { Doc, Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';

export async function requireOwnedWorkout(
  ctx: QueryCtx,
  userId: string,
  workoutId: Id<'workouts'>
): Promise<Doc<'workouts'>> {
  const workout = await ctx.db.get(workoutId);
  if (!workout || workout.userId !== userId) {
    throw new ConvexError('WORKOUT_NOT_FOUND');
  }
  return workout;
}

export function requireActive(workout: Doc<'workouts'>) {
  if (workout.status !== 'active') {
    throw new ConvexError('WORKOUT_NOT_ACTIVE');
  }
}

export async function requireOwnedSet(
  ctx: QueryCtx,
  userId: string,
  setId: Id<'sets'>
) {
  const set = await ctx.db.get(setId);
  if (!set || set.userId !== userId) throw new ConvexError('SET_NOT_FOUND');
  const workout = await requireOwnedWorkout(ctx, userId, set.workoutId);
  return { set, workout };
}

export async function requireOwnedWorkoutExercise(
  ctx: QueryCtx,
  userId: string,
  workoutExerciseId: Id<'workoutExercises'>
) {
  const workoutExercise = await ctx.db.get(workoutExerciseId);
  if (!workoutExercise) throw new ConvexError('WORKOUT_NOT_FOUND');
  const workout = await requireOwnedWorkout(
    ctx,
    userId,
    workoutExercise.workoutId
  );
  return { workout, workoutExercise };
}

export async function findActiveWorkout(ctx: QueryCtx, userId: string) {
  return ctx.db
    .query('workouts')
    .withIndex('by_user_status', (q) =>
      q.eq('userId', userId).eq('status', 'active')
    )
    .first();
}

export async function workoutExercisesOf(
  ctx: QueryCtx,
  workoutId: Id<'workouts'>
) {
  return ctx.db
    .query('workoutExercises')
    .withIndex('by_workout', (q) => q.eq('workoutId', workoutId))
    .collect();
}

export async function setsOfExercise(
  ctx: QueryCtx,
  workoutExerciseId: Id<'workoutExercises'>
) {
  return ctx.db
    .query('sets')
    .withIndex('by_workoutExercise', (q) =>
      q.eq('workoutExerciseId', workoutExerciseId)
    )
    .collect();
}

export async function setsOfWorkout(ctx: QueryCtx, workoutId: Id<'workouts'>) {
  return ctx.db
    .query('sets')
    .withIndex('by_workout', (q) => q.eq('workoutId', workoutId))
    .collect();
}

/**
 * Planned Sets are every Set except warm-ups and the unlogged Sets of skipped
 * Exercises; progress counts the completed ones.
 */
export async function progressOf(ctx: QueryCtx, workoutId: Id<'workouts'>) {
  const skipped = new Set(
    (await workoutExercisesOf(ctx, workoutId))
      .filter((workoutExercise) => workoutExercise.skipped)
      .map((workoutExercise) => workoutExercise._id)
  );
  const planned = (await setsOfWorkout(ctx, workoutId)).filter(
    (set) =>
      set.type !== 'warmup' &&
      (set.completedAt !== undefined || !skipped.has(set.workoutExerciseId))
  );
  return {
    done: planned.filter((set) => set.completedAt !== undefined).length,
    total: planned.length,
  };
}

/** When the current rest ends, including adjustments. */
export function restEndsAt(rest: NonNullable<Doc<'workouts'>['rest']>): number {
  return rest.startedAt + (rest.plannedSeconds + rest.adjustedSeconds) * 1000;
}
