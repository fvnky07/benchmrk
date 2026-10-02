// Groups: live shared sessions where each member runs their own Workout and
// reads only the others' progress summaries.
import { ConvexError, v } from 'convex/values';

import { components } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { presenceOf } from './domain/presence';
import { blockedEitherWayIds } from './lib/blocks';
import {
  activeMembership,
  addMember,
  endGroup,
  groupMembers,
  joinGroup,
  leaveGroup,
  requireMembership,
  syncGroupProgress,
} from './lib/groupProgress';
import { getIdentityId, requireIdentityId } from './lib/identity';
import { requireVerifiedEmail } from './lib/verifiedEmail';
import { groupEventKindValidator } from './schema';

const CODE_IDLE_MS = 24 * 60 * 60 * 1000;
/** No 0/O or 1/I, so codes survive being read aloud. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function requireHost(group: Doc<'groups'>, userId: string) {
  if (group.hostId !== userId) throw new ConvexError('NOT_HOST');
}

function isUsable(code: Doc<'groupCodes'>, now: number) {
  return (
    code.revokedAt === undefined &&
    now - (code.lastUsedAt ?? code.createdAt) <= CODE_IDLE_MS
  );
}

/** Creates a Group with the caller as host, before or during their Workout. */
export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireIdentityId(ctx);
    await requireVerifiedEmail(ctx, userId);
    if (await activeMembership(ctx, userId)) {
      throw new ConvexError('IN_ANOTHER_GROUP');
    }
    const now = Date.now();
    const groupId = await ctx.db.insert('groups', {
      hostId: userId,
      status: 'live',
      createdAt: now,
      lastActivityAt: now,
    });
    const group = await ctx.db.get(groupId);
    if (group) await addMember(ctx, group, userId);
    return groupId;
  },
});

/** The Group's current join code, made on demand; any member can share it. */
export const shareCode = mutation({
  args: {},
  returns: v.object({ code: v.string() }),
  handler: async (ctx) => {
    const userId = await requireIdentityId(ctx);
    const { group } = await requireMembership(ctx, userId);
    const now = Date.now();
    const codes = await ctx.db
      .query('groupCodes')
      .withIndex('by_group', (q) => q.eq('groupId', group._id))
      .collect();
    const usable = codes.find((code) => isUsable(code, now));
    if (usable) return { code: usable.code };

    let code = '';
    do {
      code = Array.from(
        { length: CODE_LENGTH },
        () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
      ).join('');
    } while (
      await ctx.db
        .query('groupCodes')
        .withIndex('by_code', (q) => q.eq('code', code))
        .first()
    );
    await ctx.db.insert('groupCodes', {
      groupId: group._id,
      code,
      createdAt: now,
    });
    return { code };
  },
});

/** The host stops every current code; a new one can be shared after. */
export const revokeCode = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireIdentityId(ctx);
    const { group } = await requireMembership(ctx, userId);
    requireHost(group, userId);
    const now = Date.now();
    const codes = await ctx.db
      .query('groupCodes')
      .withIndex('by_group', (q) => q.eq('groupId', group._id))
      .collect();
    for (const code of codes) {
      if (code.revokedAt === undefined) {
        await ctx.db.patch(code._id, { revokedAt: now });
      }
    }
  },
});

/** Joins immediately with a code or its link. */
export const joinByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    await requireVerifiedEmail(ctx, userId);
    const now = Date.now();
    const code = await ctx.db
      .query('groupCodes')
      .withIndex('by_code', (q) => q.eq('code', args.code.trim().toUpperCase()))
      .first();
    const group = code ? await ctx.db.get(code.groupId) : null;
    if (!code || !group || group.status !== 'live' || !isUsable(code, now)) {
      throw new ConvexError('CODE_INVALID');
    }

    await joinGroup(ctx, group, userId);
    await ctx.db.patch(code._id, { lastUsedAt: now });
    return group._id;
  },
});

/** Leaves the Group; the member's Workout carries on. */
export const leave = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireIdentityId(ctx);
    await requireMembership(ctx, userId);
    await leaveGroup(ctx, userId);
  },
});

/** The host ends the Group for everyone. */
export const end = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireIdentityId(ctx);
    const { group } = await requireMembership(ctx, userId);
    requireHost(group, userId);
    await endGroup(ctx, group, userId);
  },
});

/** Removes a member from this Group without ending their Workout. */
export const remove = mutation({
  args: { username: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { group } = await requireMembership(ctx, userId);
    requireHost(group, userId);
    const profile = await ctx.runQuery(
      components.betterAuth.users.getUserByUsername,
      { username: args.username.trim().toLowerCase() }
    );
    const membership = profile
      ? await activeMembership(ctx, profile._id)
      : null;
    if (
      !profile ||
      profile._id === userId ||
      membership?.groupId !== group._id
    ) {
      throw new ConvexError('MEMBER_NOT_FOUND');
    }
    await ctx.db.patch(membership._id, { removed: true });
    await leaveGroup(ctx, profile._id, 'removed');
    return null;
  },
});

/** Presence does not count as Group activity for the idle-end window. */
export const heartbeat = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireIdentityId(ctx);
    const membership = await activeMembership(ctx, userId);
    if (membership) {
      await ctx.db.patch(membership._id, { lastSeenAt: Date.now() });
    }
    return null;
  },
});

/**
 * Shows or hides the caller's weights, reps and volume from their Group;
 * hidden by default. Their summary is rewritten in the same mutation.
 */
export const setShowWeights = mutation({
  args: { shown: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { membership } = await requireMembership(ctx, userId);
    await ctx.db.patch(membership._id, { showWeights: args.shown });
    await syncGroupProgress(ctx, userId);
    return null;
  },
});

/** Only events from the caller's current arrival in a live Group. */
export const events = query({
  args: {},
  returns: v.array(
    v.object({
      eventId: v.id('groupEvents'),
      kind: groupEventKindValidator,
      username: v.union(v.string(), v.null()),
      isYou: v.boolean(),
      exerciseName: v.union(v.string(), v.null()),
      setNumber: v.union(v.number(), v.null()),
      reacted: v.boolean(),
      at: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getIdentityId(ctx);
    if (!userId) return [];
    const membership = await activeMembership(ctx, userId);
    const group = membership ? await ctx.db.get(membership.groupId) : null;
    if (!membership || group?.status !== 'live') return [];

    const blockedIds = await blockedEitherWayIds(ctx, userId);
    const groupEvents = (
      await ctx.db
        .query('groupEvents')
        .withIndex('by_group_at', (q) =>
          q.eq('groupId', group._id).gte('at', membership.joinedAt)
        )
        .order('desc')
        .collect()
    ).filter((event) => !event.userId || !blockedIds.has(event.userId));
    const actorIds = [
      ...new Set(
        groupEvents.flatMap((event) => (event.userId ? [event.userId] : []))
      ),
    ];
    const profiles = await Promise.all(
      actorIds.map(async (actorId) => {
        const profile = await ctx.runQuery(
          components.betterAuth.users.getUser,
          { userId: actorId }
        );
        return [actorId, profile?.username ?? null] as const;
      })
    );
    const usernames = new Map(profiles);
    return Promise.all(
      groupEvents.map(async (event) => {
        const reaction = await ctx.db
          .query('groupReactions')
          .withIndex('by_event_from', (q) =>
            q.eq('eventId', event._id).eq('fromUserId', userId)
          )
          .first();
        return {
          eventId: event._id,
          kind: event.kind,
          username: event.userId ? (usernames.get(event.userId) ?? null) : null,
          isYou: event.userId === userId,
          exerciseName: event.exerciseName ?? null,
          setNumber: event.setNumber ?? null,
          reacted: reaction !== null,
          at: event.at,
        };
      })
    );
  },
});

/**
 * The caller's live Group: one box per member, the caller first, then by
 * arrival. Boxes carry usernames, avatars and progress summaries only.
 */
export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getIdentityId(ctx);
    if (!userId) return null;
    const membership = await activeMembership(ctx, userId);
    const group = membership ? await ctx.db.get(membership.groupId) : null;
    if (group?.status !== 'live') return null;

    const blockedIds = await blockedEitherWayIds(ctx, userId);
    const members = (await groupMembers(ctx, group)).filter(
      (member) => !blockedIds.has(member.userId)
    );
    const now = Date.now();
    const boxes = await Promise.all(
      members.map(async (member) => {
        const profile = await ctx.runQuery(
          components.betterAuth.users.getUser,
          {
            userId: member.userId,
          }
        );
        return {
          username: profile?.username ?? 'member',
          image: profile?.image ?? null,
          isYou: member.userId === userId,
          isHost: member.userId === group.hostId,
          joinedAt: member.joinedAt,
          lastSeenAt: member.lastSeenAt ?? member.joinedAt,
          presence: presenceOf(member.lastSeenAt ?? member.joinedAt, now),
          progress: {
            ...member.progress,
            exercises: member.progress.exercises ?? [],
            currentSet: member.progress.currentSet ?? null,
            volumeKg: member.progress.volumeKg ?? null,
            weightsShown: member.progress.weightsShown ?? false,
          },
        };
      })
    );
    return {
      createdAt: group.createdAt,
      isHost: group.hostId === userId,
      showWeights: membership?.showWeights ?? false,
      members: [
        ...boxes.filter((box) => box.isYou),
        ...boxes.filter((box) => !box.isYou),
      ],
    };
  },
});
