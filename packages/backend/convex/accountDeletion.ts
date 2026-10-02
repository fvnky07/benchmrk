// Permanent deletion of a Benchmrk identity. Authentication is revoked in the
// beforeDelete hook; app-owned rows are removed in bounded scheduled batches.
import { v } from 'convex/values';

import { components, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';
import { leaveGroup } from './lib/groupProgress';

const DELETION_BATCH_SIZE = 100;

const groupDataPhase = v.union(
  v.literal('groupMemberships'),
  v.literal('groupInvitesByInviter'),
  v.literal('groupInvitesByInvitee'),
  v.literal('blocksByBlocker'),
  v.literal('blocksByBlocked'),
  v.literal('reports'),
  v.literal('reactionsByFrom'),
  v.literal('reactionsByTo'),
  v.literal('groupRecapRows'),
  v.literal('groupEvents'),
  v.literal('deviceTokens')
);

const purgePhase = v.union(
  v.literal('groupData'),
  v.literal('sets'),
  v.literal('workouts'),
  v.literal('workoutExercises'),
  v.literal('workoutBlocks'),
  v.literal('routines'),
  v.literal('routineExercises'),
  v.literal('routineBlocks'),
  v.literal('notes'),
  v.literal('machineSetups'),
  v.literal('comments'),
  v.literal('customExercises'),
  v.literal('memberSettings'),
  v.literal('groupNotifications'),
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
  groupDataPhase: v.optional(groupDataPhase),
  workoutId: v.optional(v.id('workouts')),
  routineId: v.optional(v.id('routines')),
};

type PurgeGroupDataPhase =
  | 'groupMemberships'
  | 'groupInvitesByInviter'
  | 'groupInvitesByInvitee'
  | 'blocksByBlocker'
  | 'blocksByBlocked'
  | 'reports'
  | 'reactionsByFrom'
  | 'reactionsByTo'
  | 'groupRecapRows'
  | 'groupEvents'
  | 'deviceTokens';

const NEXT_GROUP_DATA_PHASE: Record<
  PurgeGroupDataPhase,
  PurgeGroupDataPhase | null
> = {
  groupMemberships: 'groupInvitesByInviter',
  groupInvitesByInviter: 'groupInvitesByInvitee',
  groupInvitesByInvitee: 'blocksByBlocker',
  blocksByBlocker: 'blocksByBlocked',
  blocksByBlocked: 'reports',
  reports: 'reactionsByFrom',
  reactionsByFrom: 'reactionsByTo',
  reactionsByTo: 'groupRecapRows',
  groupRecapRows: 'groupEvents',
  groupEvents: 'deviceTokens',
  deviceTokens: null,
};
type PurgePhase =
  | 'groupData'
  | 'sets'
  | 'workouts'
  | 'workoutExercises'
  | 'workoutBlocks'
  | 'routines'
  | 'routineExercises'
  | 'comments'
  | 'notes'
  | 'machineSetups'
  | 'routineBlocks'
  | 'customExercises'
  | 'memberSettings'
  | 'groupNotifications'
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
  groupDataPhase?: PurgeGroupDataPhase;
};

async function scheduleBatch(ctx: MutationCtx, args: PurgeArgs) {
  await ctx.scheduler.runAfter(
    0,
    internal.accountDeletion.purgeIdentityBatch,
    args
  );
}

async function scheduleGroupDataBatch(
  ctx: MutationCtx,
  args: PurgeArgs,
  groupDataPhase: PurgeGroupDataPhase,
  isDone: boolean,
  continueCursor: string
) {
  if (!isDone) {
    await scheduleBatch(ctx, {
      ...args,
      groupDataPhase,
      cursor: continueCursor,
    });
    return;
  }
  const nextPhase = NEXT_GROUP_DATA_PHASE[groupDataPhase];
  await scheduleBatch(
    ctx,
    nextPhase
      ? { ...args, groupDataPhase: nextPhase, cursor: null }
      : { userId: args.userId, email: args.email, phase: 'sets', cursor: null }
  );
}

export const deleteIdentity = internalMutation({
  args: { userId: v.string(), email: v.string() },
  returns: v.null(),
  handler: async (ctx, { userId, email }) => {
    await leaveGroup(ctx, userId);
    await ctx.runMutation(components.betterAuth.identity.deleteIdentity, {
      userId,
    });
    await scheduleBatch(ctx, {
      userId,
      email,
      phase: 'groupData',
      groupDataPhase: 'groupMemberships',
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
      case 'groupData': {
        const groupDataPhase = args.groupDataPhase;
        if (!groupDataPhase) throw new Error('Missing Group data phase');
        switch (groupDataPhase) {
          case 'groupMemberships': {
            const page = await ctx.db
              .query('groupMemberships')
              .withIndex('by_user_left', (q) => q.eq('userId', args.userId))
              .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
            for (const row of page.page) await ctx.db.delete(row._id);
            await scheduleGroupDataBatch(
              ctx,
              args,
              groupDataPhase,
              page.isDone,
              page.continueCursor
            );
            break;
          }
          case 'groupInvitesByInviter': {
            const page = await ctx.db
              .query('groupInvites')
              .withIndex('by_inviter', (q) => q.eq('inviterId', args.userId))
              .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
            for (const row of page.page) await ctx.db.delete(row._id);
            await scheduleGroupDataBatch(
              ctx,
              args,
              groupDataPhase,
              page.isDone,
              page.continueCursor
            );
            break;
          }
          case 'groupInvitesByInvitee': {
            const page = await ctx.db
              .query('groupInvites')
              .withIndex('by_invitee', (q) => q.eq('inviteeId', args.userId))
              .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
            for (const row of page.page) await ctx.db.delete(row._id);
            await scheduleGroupDataBatch(
              ctx,
              args,
              groupDataPhase,
              page.isDone,
              page.continueCursor
            );
            break;
          }
          case 'blocksByBlocker': {
            const page = await ctx.db
              .query('blocks')
              .withIndex('by_blocker', (q) => q.eq('blockerId', args.userId))
              .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
            for (const row of page.page) await ctx.db.delete(row._id);
            await scheduleGroupDataBatch(
              ctx,
              args,
              groupDataPhase,
              page.isDone,
              page.continueCursor
            );
            break;
          }
          case 'blocksByBlocked': {
            const page = await ctx.db
              .query('blocks')
              .withIndex('by_blocked', (q) => q.eq('blockedId', args.userId))
              .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
            for (const row of page.page) await ctx.db.delete(row._id);
            await scheduleGroupDataBatch(
              ctx,
              args,
              groupDataPhase,
              page.isDone,
              page.continueCursor
            );
            break;
          }
          case 'reports': {
            const page = await ctx.db
              .query('reports')
              .withIndex('by_reporter', (q) => q.eq('reporterId', args.userId))
              .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
            for (const row of page.page) await ctx.db.delete(row._id);
            await scheduleGroupDataBatch(
              ctx,
              args,
              groupDataPhase,
              page.isDone,
              page.continueCursor
            );
            break;
          }
          case 'reactionsByFrom': {
            const page = await ctx.db
              .query('groupReactions')
              .withIndex('by_from', (q) => q.eq('fromUserId', args.userId))
              .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
            for (const row of page.page) await ctx.db.delete(row._id);
            await scheduleGroupDataBatch(
              ctx,
              args,
              groupDataPhase,
              page.isDone,
              page.continueCursor
            );
            break;
          }
          case 'reactionsByTo': {
            const page = await ctx.db
              .query('groupReactions')
              .withIndex('by_to_at', (q) => q.eq('toUserId', args.userId))
              .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
            for (const row of page.page) await ctx.db.delete(row._id);
            await scheduleGroupDataBatch(
              ctx,
              args,
              groupDataPhase,
              page.isDone,
              page.continueCursor
            );
            break;
          }
          case 'groupRecapRows': {
            const page = await ctx.db
              .query('groupRecapRows')
              .withIndex('by_user', (q) => q.eq('userId', args.userId))
              .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
            for (const row of page.page) await ctx.db.delete(row._id);
            await scheduleGroupDataBatch(
              ctx,
              args,
              groupDataPhase,
              page.isDone,
              page.continueCursor
            );
            break;
          }
          case 'groupEvents': {
            const page = await ctx.db
              .query('groupEvents')
              .withIndex('by_user', (q) => q.eq('userId', args.userId))
              .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
            for (const row of page.page) await ctx.db.delete(row._id);
            await scheduleGroupDataBatch(
              ctx,
              args,
              groupDataPhase,
              page.isDone,
              page.continueCursor
            );
            break;
          }
          case 'deviceTokens': {
            const page = await ctx.db
              .query('deviceTokens')
              .withIndex('by_user', (q) => q.eq('userId', args.userId))
              .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
            for (const row of page.page) await ctx.db.delete(row._id);
            await scheduleGroupDataBatch(
              ctx,
              args,
              groupDataPhase,
              page.isDone,
              page.continueCursor
            );
            break;
          }
        }
        return null;
      }
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
            phase: 'notes',
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
      case 'notes': {
        const page = await ctx.db
          .query('notes')
          .withIndex('by_userId', (q) => q.eq('userId', args.userId))
          .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
        for (const note of page.page) await ctx.db.delete(note._id);
        await scheduleBatch(
          ctx,
          page.isDone
            ? { ...args, phase: 'machineSetups', cursor: null }
            : { ...args, cursor: page.continueCursor }
        );
        return null;
      }
      case 'machineSetups': {
        const page = await ctx.db
          .query('machineSetups')
          .withIndex('by_user_exercise', (q) => q.eq('userId', args.userId))
          .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
        for (const setup of page.page) await ctx.db.delete(setup._id);
        await scheduleBatch(
          ctx,
          page.isDone
            ? { ...args, phase: 'comments', cursor: null }
            : { ...args, cursor: page.continueCursor }
        );
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
            ? { ...args, phase: 'groupNotifications', cursor: null }
            : { ...args, cursor: page.continueCursor }
        );
        return null;
      }
      case 'groupNotifications': {
        const page = await ctx.db
          .query('groupNotifications')
          .withIndex('by_user', (q) => q.eq('userId', args.userId))
          .paginate({ numItems: DELETION_BATCH_SIZE, cursor: args.cursor });
        for (const entry of page.page) await ctx.db.delete(entry._id);
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
