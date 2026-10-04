import { ConvexError, v } from 'convex/values';

import { components } from './_generated/api';
import { mutation, query } from './_generated/server';
import { activeMembership, requireMembership } from './lib/groupProgress';
import { getIdentityId, requireIdentityId } from './lib/identity';

/** One fist bump per sender and stable target, even after unchecking/relogging. */
export const fistBump = mutation({
  args: { eventId: v.id('groupEvents') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { membership, group } = await requireMembership(ctx, userId);
    const event = await ctx.db.get(args.eventId);
    if (
      !event ||
      event.groupId !== group._id ||
      event.at < membership.joinedAt
    ) {
      throw new ConvexError('EVENT_NOT_FOUND');
    }
    if (
      (event.kind !== 'setCompleted' && event.kind !== 'targetMet') ||
      !event.userId ||
      !event.targetId
    ) {
      throw new ConvexError('NOT_REACTABLE');
    }
    if (event.userId === userId) throw new ConvexError('OWN_EVENT');
    const targetId = event.targetId;

    const existing = await ctx.db
      .query('groupReactions')
      .withIndex('by_target_from', (q) =>
        q.eq('targetId', targetId).eq('fromUserId', userId)
      )
      .first();
    if (existing) return null;

    const recipient = await activeMembership(ctx, event.userId);
    await ctx.db.insert('groupReactions', {
      groupId: group._id,
      eventId: event._id,
      targetId,
      fromUserId: userId,
      toUserId: event.userId,
      at: Date.now(),
      delivered: recipient?.groupId === group._id && !recipient.reactionsMuted,
    });
    return null;
  },
});

/** Muting affects delivery at send time, not previously delivered reactions. */
export const setMuted = mutation({
  args: { muted: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { membership } = await requireMembership(ctx, userId);
    await ctx.db.patch(membership._id, { reactionsMuted: args.muted });
    return null;
  },
});

export const mine = query({
  args: {},
  returns: v.object({
    muted: v.boolean(),
    received: v.array(
      v.object({
        reactionId: v.id('groupReactions'),
        fromUsername: v.string(),
        eventKind: v.union(v.literal('setCompleted'), v.literal('targetMet')),
        exerciseName: v.union(v.string(), v.null()),
        setNumber: v.union(v.number(), v.null()),
        at: v.number(),
      })
    ),
  }),
  handler: async (ctx) => {
    const userId = await getIdentityId(ctx);
    if (!userId) return { muted: false, received: [] };
    const membership = await activeMembership(ctx, userId);
    const group = membership ? await ctx.db.get(membership.groupId) : null;
    if (!membership || group?.status !== 'live') {
      return { muted: false, received: [] };
    }

    const reactions = (
      await ctx.db
        .query('groupReactions')
        .withIndex('by_to_at', (q) =>
          q.eq('toUserId', userId).gte('at', membership.joinedAt)
        )
        .order('desc')
        .collect()
    ).filter(
      (reaction) => reaction.groupId === group._id && reaction.delivered
    );
    const senderIds = [
      ...new Set(reactions.map((reaction) => reaction.fromUserId)),
    ];
    const profiles = await Promise.all(
      senderIds.map(async (senderId) => {
        const profile = await ctx.runQuery(
          components.betterAuth.users.getUser,
          { userId: senderId }
        );
        return [senderId, profile?.username ?? 'member'] as const;
      })
    );
    const usernames = new Map(profiles);
    const received = await Promise.all(
      reactions.map(async (reaction) => {
        const event = await ctx.db.get(reaction.eventId);
        if (
          !event ||
          (event.kind !== 'setCompleted' && event.kind !== 'targetMet')
        ) {
          return null;
        }
        return {
          reactionId: reaction._id,
          fromUsername: usernames.get(reaction.fromUserId) ?? 'member',
          eventKind: event.kind,
          exerciseName: event.exerciseName ?? null,
          setNumber: event.setNumber ?? null,
          at: reaction.at,
        };
      })
    );
    return {
      muted: membership.reactionsMuted ?? false,
      received: received.flatMap((reaction) => (reaction ? [reaction] : [])),
    };
  },
});
