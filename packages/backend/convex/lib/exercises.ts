import { ConvexError } from 'convex/values';

import type { Doc, Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';

/** A catalog Exercise or the member's own custom one; anything else is not found. */
export async function requireVisibleExercise(
  ctx: QueryCtx,
  userId: string,
  exerciseId: Id<'exercises'>
): Promise<Doc<'exercises'>> {
  const exercise = await ctx.db.get(exerciseId);
  if (
    !exercise ||
    (exercise.createdBy !== undefined && exercise.createdBy !== userId)
  ) {
    throw new ConvexError('EXERCISE_NOT_FOUND');
  }
  return exercise;
}
