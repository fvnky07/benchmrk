// Permanent deletion of a Benchmrk identity. Authentication is revoked in the
// beforeDelete hook; app-owned rows are removed in bounded scheduled batches.
import { v } from 'convex/values';

import { components, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';

const DELETION_BATCH_SIZE = 100;

const purgePhase = v.union(
  v.literal('sets'),
  v.literal('workouts'),
  v.literal('workoutExercises'),
  v.literal('workoutBlocks'),
  v.literal('routines'),
  v.literal('routineExercises'),
  v.literal('routineBlocks'),
  v.literal('comments'),
  v.literal('customExercises'),
  v.literal('memberSettings'),
  v.literal('waitlist'),
  v.literal('magicLinkRequests'),
  v.literal('done')
);

const purgeArgs = {
  userId: v.string(),
  email: v.string(),
  phase: purgePhase,
  cursor: v.union(v.string(), v.null()),
  resumeCursor: v.optional(v.union(v.string(), v.null())),
  workoutId: v.optional(v.id('workouts')),
  routineId: v.optional(v.id('routines')),
};

type PurgePhase =
  | 'sets'
  | 'workouts'
  | 'workoutExercises'
  | 'workoutBlocks'
  | 'routines'
  | 'routineExercises'
  | 'comments'
  | 'routineBlocks'
  | 'customExercises'
  | 'memberSettings'
  | 'waitlist'
  | 'magicLinkRequests'
  | 'done';

type PurgeArgs = {
  userId: string;
  email: string;
  phase: PurgePhase;
  cursor: string | null;
  resumeCursor?: string | null;
  workoutId?: Id<'workouts'>;
  routineId?: Id<'routines'>;
};

async function scheduleBatch(ctx: MutationCtx, args: PurgeArgs) {
  await ctx.scheduler.runAfter(
    0,
    internal.accountDeletion.purgeIdentityBatch,
    args
  );
}

export const deleteIdentity = internalMutation({
  args: { userId: v.string(), email: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, email }) => {
    await ctx.runMutation(components.betterAuth.identity.deleteIdentity, {
      userId,
    });
    await scheduleBatch(ctx, {
      userId,
      email,
      phase: 'sets',
      cursor: null,
    });
    return null;
  },
});

export const purgeIdentityBatch = internalMutation({
  args: purgeArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    switch (args.phase) {
      case 'sets': {
        const page = await ctx.db
          .query('sets')
          .withIndex('by_userId', (q) => q.eq('userId', args.userId))
          .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
        for (const set of page.page) await ctx.db.delete(set._id);
        await scheduleBatch(
          ctx,
          page.isDone
            ? { ...args, phase: 'workouts', cursor: null }
            : { ...args, cursor: page.continueCursor }
        );
        return null;
      }
      case 'workouts': {
        const page = await ctx.db
          .query('workouts')
          .withIndex('by_user_started', (q) => q.eq('userId', args.userId))
          .paginate({ numItems: 1, cursor: args.cursor });
        const workout = page.page[0];
        if (!workout) {
          await scheduleBatch(ctx, {
            ...args,
            phase: 'routines',
            cursor: null,
          });
          return null;
        }
        await scheduleBatch(ctx, {
          ...args,
          phase: 'workoutExercises',
          cursor: null,
          resumeCursor: page.continueCursor,
          workoutId: workout._id,
        });
        return null;
      }
      case 'workoutExercises': {
        const workoutId = args.workoutId;
        if (!workoutId) throw new Error('Missing Workout ID');
        const page = await ctx.db
          .query('workoutExercises')
          .withIndex('by_workout', (q) => q.eq('workoutId', workoutId))
          .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
        for (const exercise of page.page) await ctx.db.delete(exercise._id);
        if (page.isDone) {
          await scheduleBatch(ctx, {
            ...args,
            phase: 'workoutBlocks',
            cursor: null,
          });
        } else {
          await scheduleBatch(ctx, { ...args, cursor: page.continueCursor });
        }
        return null;
      }
      case 'workoutBlocks': {
        const workoutId = args.workoutId;
        if (!workoutId) throw new Error('Missing Workout ID');
        const page = await ctx.db
          .query('workoutBlocks')
          .withIndex('by_workout', (q) => q.eq('workoutId', workoutId))
          .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
        for (const block of page.page) await ctx.db.delete(block._id);
        if (page.isDone) {
          await ctx.db.delete(workoutId);
          await scheduleBatch(ctx, {
            userId: args.userId,
            email: args.email,
            phase: 'workouts',
            cursor: args.resumeCursor ?? null,
          });
        } else {
          await scheduleBatch(ctx, { ...args, cursor: page.continueCursor });
        }
        return null;
      }
      case 'routines': {
        const page = await ctx.db
          .query('routines')
          .withIndex('by_userId', (q) => q.eq('userId', args.userId))
          .paginate({ numItems: 1, cursor: args.cursor });
        const routine = page.page[0];
        if (!routine) {
          await scheduleBatch(ctx, {
            ...args,
            phase: 'comments',
            cursor: null,
          });
          return null;
        }
        await scheduleBatch(ctx, {
          ...args,
          phase: 'routineExercises',
          cursor: null,
          resumeCursor: page.continueCursor,
          routineId: routine._id,
        });
        return null;
      }
      case 'routineExercises': {
        const routineId = args.routineId;
        if (!routineId) throw new Error('Missing Routine ID');
        const page = await ctx.db
          .query('routineExercises')
          .withIndex('by_routine', (q) => q.eq('routineId', routineId))
          .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
        for (const exercise of page.page) await ctx.db.delete(exercise._id);
        if (page.isDone) {
          await scheduleBatch(ctx, {
            ...args,
            phase: 'routineBlocks',
            cursor: null,
          });
        } else {
          await scheduleBatch(ctx, { ...args, cursor: page.continueCursor });
        }
        return null;
      }
      case 'routineBlocks': {
        const routineId = args.routineId;
        if (!routineId) throw new Error('Missing Routine ID');
        const page = await ctx.db
          .query('routineBlocks')
          .withIndex('by_routine', (q) => q.eq('routineId', routineId))
          .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
        for (const block of page.page) await ctx.db.delete(block._id);
        if (page.isDone) {
          await ctx.db.delete(routineId);
          await scheduleBatch(ctx, {
            userId: args.userId,
            email: args.email,
            phase: 'routines',
            cursor: args.resumeCursor ?? null,
          });
        } else {
          await scheduleBatch(ctx, { ...args, cursor: page.continueCursor });
        }
        return null;
      }
      case 'comments': {
        const page = await ctx.db
          .query('exerciseComments')
          .withIndex('by_userId', (q) => q.eq('userId', args.userId))
          .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
        for (const comment of page.page) await ctx.db.delete(comment._id);
        await scheduleBatch(
          ctx,
          page.isDone
            ? { ...args, phase: 'customExercises', cursor: null }
            : { ...args, cursor: page.continueCursor }
        );
        return null;
      }
      case 'customExercises': {
        const page = await ctx.db
          .query('exercises')
          .withIndex('by_createdBy', (q) => q.eq('createdBy', args.userId))
          .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
        for (const exercise of page.page) await ctx.db.delete(exercise._id);
        await scheduleBatch(
          ctx,
          page.isDone
            ? { ...args, phase: 'memberSettings', cursor: null }
            : { ...args, cursor: page.continueCursor }
        );
        return null;
      }
      case 'memberSettings': {
        const page = await ctx.db
          .query('memberSettings')
          .withIndex('by_userId', (q) => q.eq('userId', args.userId))
          .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
        for (const settings of page.page) await ctx.db.delete(settings._id);
        await scheduleBatch(
          ctx,
          page.isDone
            ? { ...args, phase: 'waitlist', cursor: null }
            : { ...args, cursor: page.continueCursor }
        );
        return null;
      }
      case 'waitlist': {
        const page = await ctx.db
          .query('waitlist')
          .withIndex('by_email', (q) => q.eq('email', args.email.toLowerCase()))
          .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
        for (const entry of page.page) await ctx.db.delete(entry._id);
        await scheduleBatch(
          ctx,
          page.isDone
            ? { ...args, phase: 'magicLinkRequests', cursor: null }
            : { ...args, cursor: page.continueCursor }
        );
        return null;
      }
      case 'magicLinkRequests': {
        const page = await ctx.db
          .query('magicLinkRequests')
          .withIndex('by_email', (q) => q.eq('email', args.email.toLowerCase()))
          .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
        for (const request of page.page) await ctx.db.delete(request._id);
        await scheduleBatch(ctx, {
          ...args,
          phase: 'done',
          cursor: null,
        });
        return null;
      }
      case 'done':
        return null;
    }
  },
});
