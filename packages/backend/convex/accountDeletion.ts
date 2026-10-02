// Permanent deletion of a Benchmrk identity. Better Auth's /delete-user does
// the re-authentication (password, or a session fresh from signing in again)
// and then calls `deleteIdentity` from its beforeDelete hook, so the app data
// and every component record go in one transaction: either all of it is
// removed, or nothing is.
import { v } from 'convex/values';

import { components } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';
import { leaveGroup } from './lib/groupProgress';

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
    const workoutBlocks = await ctx.db
      .query('workoutBlocks')
      .withIndex('by_workout', (q) => q.eq('workoutId', workout._id))
      .collect();
    for (const block of workoutBlocks) await ctx.db.delete(block._id);
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
    const routineBlocks = await ctx.db
      .query('routineBlocks')
      .withIndex('by_routine', (q) => q.eq('routineId', routine._id))
      .collect();
    for (const block of routineBlocks) await ctx.db.delete(block._id);
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

/** Remove only this identity's Group data; other members keep their recaps. */
async function deleteGroupData(ctx: MutationCtx, userId: string) {
  const rows = await Promise.all([
    ctx.db
      .query('groupMemberships')
      .withIndex('by_user_left', (q) => q.eq('userId', userId))
      .collect(),
    ctx.db
      .query('groupInvites')
      .withIndex('by_inviter', (q) => q.eq('inviterId', userId))
      .collect(),
    ctx.db
      .query('groupInvites')
      .withIndex('by_invitee', (q) => q.eq('inviteeId', userId))
      .collect(),
    ctx.db
      .query('blocks')
      .withIndex('by_blocker', (q) => q.eq('blockerId', userId))
      .collect(),
    ctx.db
      .query('blocks')
      .withIndex('by_blocked', (q) => q.eq('blockedId', userId))
      .collect(),
    ctx.db
      .query('reports')
      .withIndex('by_reporter', (q) => q.eq('reporterId', userId))
      .collect(),
    ctx.db
      .query('groupReactions')
      .withIndex('by_from', (q) => q.eq('fromUserId', userId))
      .collect(),
    ctx.db
      .query('groupReactions')
      .withIndex('by_to_at', (q) => q.eq('toUserId', userId))
      .collect(),
    ctx.db
      .query('groupRecapRows')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
    ctx.db
      .query('groupEvents')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
    ctx.db
      .query('deviceTokens')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
  ]);
  const ids = new Set(rows.flat().map((row) => row._id));
  for (const id of ids) await ctx.db.delete(id);
  // Ended Groups whose hostId is this identity stay: other members' recap
  // rows still reference the Group, even after its host's identity is gone.
}

export const deleteIdentity = internalMutation({
  args: { userId: v.string(), email: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, email }) => {
    // Leave before deleting Workouts so the final summary and host handoff
    // happen in the same transaction as Better Auth's beforeDelete hook.
    await leaveGroup(ctx, userId);
    await deleteGroupData(ctx, userId);
    await deleteWorkouts(ctx, userId);
    await deleteRoutines(ctx, userId);
    // Notes and Machine setups first: they can point at custom Exercises.
    const notes = await ctx.db
      .query('notes')
      .withIndex('by_user_workout', (q) => q.eq('userId', userId))
      .collect();
    for (const note of notes) await ctx.db.delete(note._id);
    const setups = await ctx.db
      .query('machineSetups')
      .withIndex('by_user_exercise', (q) => q.eq('userId', userId))
      .collect();
    for (const setup of setups) await ctx.db.delete(setup._id);
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
