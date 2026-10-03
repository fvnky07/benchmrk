// Group invites by exact username, answered in the invitee's inbox. Until
// they accept, the invitee sees nothing about the Group but the inviter's
// username.
import { ConvexError, v } from 'convex/values';

import { components, internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { mutation, type QueryCtx, query } from './_generated/server';
import { blockedEitherWay, blockedEitherWayIds } from './lib/blocks';
import { joinGroup, requireMembership } from './lib/groupProgress';
import { getIdentityId, requireIdentityId } from './lib/identity';
import { requireVerifiedEmail } from './lib/verifiedEmail';
import { readMemberSettings } from './memberSettings';

const HOUR_MS = 60 * 60 * 1000;
const INVITE_LIFETIME_MS = 24 * HOUR_MS;
const INVITES_PER_HOUR = 10;
const COOLDOWN_AFTER_DECLINE_MS = HOUR_MS;

type InviteState = 'pending' | 'expired' | 'ended';

function stateOf(
  invite: Doc<'groupInvites'>,
  group: Doc<'groups'> | null,
  now: number
): InviteState {
  if (group?.status !== 'live') return 'ended';
  return now - invite.createdAt > INVITE_LIFETIME_MS ? 'expired' : 'pending';
}

/** Whether two members were ever in the same Group at the same time. */
async function haveBeenInAGroupTogether(
  ctx: QueryCtx,
  userId: string,
  otherId: string
) {
  const memberships = await ctx.db
    .query('groupMemberships')
    .withIndex('by_user_left', (q) => q.eq('userId', userId))
    .collect();
  for (const membership of memberships) {
    const others = await ctx.db
      .query('groupMemberships')
      .withIndex('by_group_left', (q) => q.eq('groupId', membership.groupId))
      .collect();
    const overlapped = others.some(
      (other) =>
        other.userId === otherId &&
        other.joinedAt < (membership.leftAt ?? Number.POSITIVE_INFINITY) &&
        membership.joinedAt < (other.leftAt ?? Number.POSITIVE_INFINITY)
    );
    if (overlapped) return true;
  }
  return false;
}

/**
 * Whether an invite reaches the invitee: they need a verified email, and
 * their invite permission must let the inviter through.
 */
async function reachesInvitee(
  ctx: QueryCtx,
  inviterId: string,
  invitee: { _id: string; emailVerified: boolean }
) {
  if (!invitee.emailVerified) return false;
  const { invitesFrom } = await readMemberSettings(ctx, invitee._id);
  if (invitesFrom === 'everyone') return true;
  if (invitesFrom === 'nobody') return false;
  return haveBeenInAGroupTogether(ctx, invitee._id, inviterId);
}

/** The caller's own delivered, unanswered invite. */
async function requireOwnInvite(
  ctx: QueryCtx,
  userId: string,
  inviteId: Doc<'groupInvites'>['_id']
) {
  const invite = await ctx.db.get(inviteId);
  if (
    !invite ||
    invite.inviteeId !== userId ||
    !invite.delivered ||
    invite.status !== 'pending'
  ) {
    throw new ConvexError('INVITE_NOT_FOUND');
  }
  return invite;
}

/**
 * Invites a member to the caller's Group by exact username. Looks sent
 * whenever the username exists, whether or not the invitee's permission lets
 * it reach them.
 */
export const send = mutation({
  args: { username: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { group } = await requireMembership(ctx, userId);
    const invitee = await ctx.runQuery(
      components.betterAuth.users.getUserByUsername,
      { username: args.username.trim().toLowerCase() }
    );
    if (!invitee) throw new ConvexError('NO_SUCH_USERNAME');
    const inviteeId = invitee._id;
    const inviteeMembership = await ctx.db
      .query('groupMemberships')
      .withIndex('by_user_left', (q) =>
        q.eq('userId', inviteeId).eq('leftAt', undefined)
      )
      .first();
    if (inviteeMembership?.groupId === group._id) {
      throw new ConvexError('ALREADY_IN_GROUP');
    }

    const now = Date.now();
    const sentLastHour = await ctx.db
      .query('groupInvites')
      .withIndex('by_inviter', (q) =>
        q.eq('inviterId', userId).gt('createdAt', now - HOUR_MS)
      )
      .collect();
    if (sentLastHour.length >= INVITES_PER_HOUR) {
      throw new ConvexError('INVITE_LIMIT');
    }
    const earlier = await ctx.db
      .query('groupInvites')
      .withIndex('by_inviter_invitee', (q) =>
        q.eq('inviterId', userId).eq('inviteeId', inviteeId)
      )
      .collect();
    if (
      earlier.some(
        (invite) =>
          invite.status === 'declined' &&
          now - (invite.respondedAt ?? invite.createdAt) <
            COOLDOWN_AFTER_DECLINE_MS
      )
    ) {
      throw new ConvexError('INVITE_COOLDOWN');
    }
    const alreadyPending = earlier.some(
      (invite) =>
        invite.groupId === group._id &&
        invite.status === 'pending' &&
        now - invite.createdAt <= INVITE_LIFETIME_MS
    );
    if (alreadyPending) return null;

    const delivered =
      !(await blockedEitherWay(ctx, userId, inviteeId)) &&
      (await reachesInvitee(ctx, userId, invitee));
    const inviteId = await ctx.db.insert('groupInvites', {
      groupId: group._id,
      inviterId: userId,
      inviteeId,
      createdAt: now,
      delivered,
      status: 'pending',
    });
    if (delivered) {
      await ctx.scheduler.runAfter(0, internal.push.sendGroupInvite, {
        inviteId,
      });
    }
    return null;
  },
});

/**
 * The caller's unanswered invites, newest first: the inviter's username and
 * whether it can still be accepted. Nothing else about the Group.
 */
export const inbox = query({
  args: {},
  returns: v.array(
    v.object({
      inviteId: v.id('groupInvites'),
      inviterUsername: v.string(),
      sentAt: v.number(),
      state: v.union(
        v.literal('pending'),
        v.literal('expired'),
        v.literal('ended')
      ),
    })
  ),
  handler: async (ctx) => {
    const userId = await getIdentityId(ctx);
    if (!userId) return [];
    const now = Date.now();
    const invites = await ctx.db
      .query('groupInvites')
      .withIndex('by_invitee', (q) =>
        q.eq('inviteeId', userId).eq('delivered', true).eq('status', 'pending')
      )
      .order('desc')
      .collect();
    return Promise.all(
      invites.map(async (invite) => {
        const inviter = await ctx.runQuery(
          components.betterAuth.users.getUser,
          { userId: invite.inviterId }
        );
        return {
          inviteId: invite._id,
          inviterUsername: inviter?.username ?? 'member',
          sentAt: invite.createdAt,
          state: stateOf(invite, await ctx.db.get(invite.groupId), now),
        };
      })
    );
  },
});

/** Accepts an invite and joins its Group under the normal join rules. */
export const accept = mutation({
  args: { inviteId: v.id('groupInvites') },
  returns: v.id('groups'),
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    await requireVerifiedEmail(ctx, userId);
    const invite = await requireOwnInvite(ctx, userId, args.inviteId);
    const group = await ctx.db.get(invite.groupId);
    const now = Date.now();
    const state = stateOf(invite, group, now);
    if (!group || state === 'ended') throw new ConvexError('GROUP_ENDED');
    if (state === 'expired') throw new ConvexError('INVITE_EXPIRED');

    await joinGroup(ctx, group, userId);
    // Every invite to this Group is answered by joining it.
    const pending = await ctx.db
      .query('groupInvites')
      .withIndex('by_invitee', (q) =>
        q.eq('inviteeId', userId).eq('delivered', true).eq('status', 'pending')
      )
      .collect();
    for (const other of pending) {
      if (other.groupId === group._id) {
        await ctx.db.patch(other._id, {
          status: 'accepted',
          respondedAt: now,
        });
      }
    }
    return group._id;
  },
});

/**
 * Declines an invite; its inviter can't invite again for an hour. Clearing
 * one that expired or whose Group ended is a dismissal, with no cooldown.
 */
export const decline = mutation({
  args: { inviteId: v.id('groupInvites') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const invite = await requireOwnInvite(ctx, userId, args.inviteId);
    const now = Date.now();
    const state = stateOf(invite, await ctx.db.get(invite.groupId), now);
    await ctx.db.patch(invite._id, {
      status: state === 'pending' ? 'declined' : 'dismissed',
      respondedAt: now,
    });
    return null;
  },
});

/** Recipient-owned notices survive membership, but respect current blocks. */
export const eventInbox = query({
  args: {},
  returns: v.array(
    v.object({
      entryId: v.id('groupNotifications'),
      copy: v.string(),
      sentAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getIdentityId(ctx);
    if (!userId) return [];
    const entries = await ctx.db
      .query('groupNotifications')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect();
    const blockedIds = await blockedEitherWayIds(ctx, userId);
    return entries
      .filter((entry) => !entry.actorId || !blockedIds.has(entry.actorId))
      .map((entry) => ({
        entryId: entry._id,
        copy: entry.copy,
        sentAt: entry.createdAt,
      }));
  },
});

export const dismissEvent = mutation({
  args: { entryId: v.id('groupNotifications') },
  returns: v.null(),
  handler: async (ctx, { entryId }) => {
    const userId = await requireIdentityId(ctx);
    const entry = await ctx.db.get(entryId);
    if (!entry || entry.userId !== userId) {
      throw new ConvexError('INBOX_ENTRY_NOT_FOUND');
    }
    await ctx.db.delete(entry._id);
    return null;
  },
});
