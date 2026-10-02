// Permanent deletion of a Benchmrk identity. Better Auth's /delete-user does
// the re-authentication (password, or a session fresh from signing in again)
// and then calls `deleteIdentity` from its beforeDelete hook, so the app data
// and every component record go in one transaction: either all of it is
// removed, or nothing is.
import { v } from 'convex/values';

import { components } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';

async function deleteWorkouts(ctx: MutationCtx, userId: string) {
  const workouts = await ctx.db
    .query('workouts')
    .withIndex('by_user_started', (q) => q.eq('userId', userId))
    .collect();
  for (const workout of workouts) {
    const sets = await ctx.db
      .query('sets')
      .withIndex('by_workout', (q) => q.eq('workoutId', workout._id))
      .collect();
    for (const set of sets) await ctx.db.delete(set._id);
    const workoutExercises = await ctx.db
      .query('workoutExercises')
      .withIndex('by_workout', (q) => q.eq('workoutId', workout._id))
      .collect();
    for (const item of workoutExercises) await ctx.db.delete(item._id);
    await ctx.db.delete(workout._id);
  }
}

async function deleteRoutines(ctx: MutationCtx, userId: string) {
  const routines = await ctx.db
    .query('routines')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .collect();
  for (const routine of routines) {
    const routineExercises = await ctx.db
      .query('routineExercises')
      .withIndex('by_routine', (q) => q.eq('routineId', routine._id))
      .collect();
    for (const item of routineExercises) await ctx.db.delete(item._id);
    await ctx.db.delete(routine._id);
  }
}

/**
 * Custom Exercises are visible only to their creator, so nothing of another
 * member's can reference them; their comments go with them.
 */
async function deleteCustomExercises(ctx: MutationCtx, userId: string) {
  const exercises = await ctx.db
    .query('exercises')
    .withIndex('by_createdBy', (q) => q.eq('createdBy', userId))
    .collect();
  for (const exercise of exercises) {
    await deleteComments(
      ctx,
      await ctx.db
        .query('exerciseComments')
        .withIndex('by_exercise', (q) => q.eq('exerciseId', exercise._id))
        .collect()
    );
    await ctx.db.delete(exercise._id);
  }
}

async function deleteComments(
  ctx: MutationCtx,
  comments: { _id: Id<'exerciseComments'> }[]
) {
  for (const comment of comments) await ctx.db.delete(comment._id);
}

async function deleteByEmail(
  ctx: MutationCtx,
  table: 'waitlist' | 'magicLinkRequests',
  email: string
) {
  const rows = await ctx.db
    .query(table)
    .withIndex('by_email', (q) => q.eq('email', email))
    .collect();
  for (const row of rows) await ctx.db.delete(row._id);
}

export const deleteIdentity = internalMutation({
  args: { userId: v.string(), email: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, email }) => {
    await deleteWorkouts(ctx, userId);
    await deleteRoutines(ctx, userId);
    await deleteCustomExercises(ctx, userId);
    await deleteComments(
      ctx,
      await ctx.db
        .query('exerciseComments')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .collect()
    );
    const settings = await ctx.db
      .query('memberSettings')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .unique();
    if (settings) await ctx.db.delete(settings._id);
    await deleteByEmail(ctx, 'waitlist', email.toLowerCase());
    await deleteByEmail(ctx, 'magicLinkRequests', email.toLowerCase());

    await ctx.runMutation(components.betterAuth.identity.deleteIdentity, {
      userId,
    });
    return null;
  },
});
