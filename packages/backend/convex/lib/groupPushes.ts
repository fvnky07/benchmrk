// When a Group's lifecycle events and invites become pushes. Lifecycle code
// reports the event facts and the recipient snapshot; this module decides the
// join merging, who is told, and which invitees' badges to refresh. Blocks and
// push switches are checked when the push is sent, not here.
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

/** Joins this close after the first one go out as one push. */
export const JOIN_MERGE_MS = 60_000;

/** An invite stops being actionable this long after it was sent. */
export const INVITE_LIFETIME_MS = 24 * 60 * 60 * 1000;

export type GroupNotice =
  | { kind: 'joined'; groupId: Id<'groups'>; eventId: Id<'groupEvents'> }
  | {
      kind: 'left';
      groupId: Id<'groups'>;
      actorId: string;
      /** The members still in the Group. */
      recipientIds: string[];
    }
  | {
      kind: 'ended';
      groupId: Id<'groups'>;
      /** Who ended it, if a member did; they are not told. */
      actorId?: string;
      /** Everyone who was in the Group. */
      recipientIds: string[];
    };

/**
 * Schedules the push for a Group event that has already been recorded. A join
 * opens a merge window unless one is open. A Group ending also refreshes the
 * badge of everyone with an invite to it, since that invite is no longer
 * actionable.
 */
export async function notifyGroupEvent(ctx: MutationCtx, notice: GroupNotice) {
  const { groupId } = notice;
  if (notice.kind === 'joined') {
    const event = await ctx.db.get(notice.eventId);
    if (!event) return;
    const recent = await ctx.db
      .query('groupEvents')
      .withIndex('by_group_at', (q) =>
        q.eq('groupId', groupId).gt('at', event.at - JOIN_MERGE_MS)
      )
      .collect();
    const windowOpen = recent.some(
      (other) => other.batchUntil !== undefined && other.batchUntil > event.at
    );
    if (windowOpen) return;
    const until = event.at + JOIN_MERGE_MS;
    await ctx.db.patch(event._id, { batchUntil: until });
    await ctx.scheduler.runAfter(JOIN_MERGE_MS, internal.push.sendJoins, {
      groupId,
      from: event.at,
      until,
    });
    return;
  }

  const { actorId, recipientIds } = notice;
  const told = recipientIds.filter((userId) => userId !== actorId);
  if (told.length) {
    await ctx.scheduler.runAfter(0, internal.push.sendGroupEvent, {
      kind: notice.kind,
      actorId,
      recipientIds: told,
    });
  }
  if (notice.kind === 'ended') {
    const invites = await ctx.db
      .query('groupInvites')
      .withIndex('by_group', (q) => q.eq('groupId', groupId))
      .collect();
    const inviteeIds = [
      ...new Set(
        invites
          .filter((invite) => invite.delivered && invite.status === 'pending')
          .map((invite) => invite.inviteeId)
      ),
    ];
    if (inviteeIds.length) {
      await ctx.scheduler.runAfter(0, internal.push.sendBadgeRefreshes, {
        inviteeIds,
      });
    }
  }
}

/**
 * Schedules a delivered invite's push, and a badge refresh for when it
 * expires, so the badge drops even if the app stays closed.
 */
export async function notifyInviteSent(
  ctx: MutationCtx,
  invite: { inviteId: Id<'groupInvites'>; inviteeId: string }
) {
  await ctx.scheduler.runAfter(0, internal.push.sendGroupInvite, {
    inviteId: invite.inviteId,
  });
  await ctx.scheduler.runAfter(
    INVITE_LIFETIME_MS + 1,
    internal.push.sendBadgeRefreshes,
    { inviteeIds: [invite.inviteeId] }
  );
}
