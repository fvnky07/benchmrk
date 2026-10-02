// Groups: live shared sessions where each member runs their own Workout and
// reads only the others' progress summaries.
import { ConvexError, v } from 'convex/values';

import { components } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import {
  activeMembership,
  addMember,
  endGroup,
  groupMembers,
  joinGroup,
  leaveGroup,
  requireMembership,
} from './lib/groupProgress';
import { getIdentityId, requireIdentityId } from './lib/identity';
import { requireVerifiedEmail } from './lib/verifiedEmail';
import { randomCode } from './lib/webCrypto';

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
      code = randomCode(CODE_ALPHABET, CODE_LENGTH);
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
    await endGroup(ctx, group);
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

    const members = await groupMembers(ctx, group);
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
          progress: member.progress,
        };
      })
    );
    return {
      createdAt: group.createdAt,
      isHost: group.hostId === userId,
      members: [
        ...boxes.filter((box) => box.isYou),
        ...boxes.filter((box) => !box.isYou),
      ],
    };
  },
});
