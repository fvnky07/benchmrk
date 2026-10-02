// Pushes through the Expo Push Service. The inbox stays the source of truth:
// there are no retries beyond checking receipts.
import { ConvexError, type Infer, v } from 'convex/values';

import { components, internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
  type QueryCtx,
} from './_generated/server';
import { readMemberSettings } from './memberSettings';

const SEND_URL = 'https://exp.host/--/api/v2/push/send';
const RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const RECEIPT_DELAY_MS = 15 * 60 * 1000;
const INVITE_LIFETIME_MS = 24 * 60 * 60 * 1000;
const SEND_BATCH_SIZE = 100;
type PushType = 'invites' | 'joins' | 'leaves' | 'groupEnded';

/** Each push type's switch; all of them sit under `pushNotifications`. */
const SWITCHES: Record<
  PushType,
  'pushInvites' | 'pushJoins' | 'pushLeaves' | 'pushGroupEnded'
> = {
  invites: 'pushInvites',
  joins: 'pushJoins',
  leaves: 'pushLeaves',
  groupEnded: 'pushGroupEnded',
};

const CHANNELS: Record<PushType, string> = {
  invites: 'group-invites',
  joins: 'group-activity',
  leaves: 'group-activity',
  groupEnded: 'group-activity',
};

const deviceValidator = v.object({
  deviceTokenId: v.id('deviceTokens'),
  token: v.string(),
  userId: v.string(),
  updatedAt: v.number(),
});

const pushDataValidator = v.union(
  v.object({
    type: v.literal('groupInvite'),
    inviteId: v.id('groupInvites'),
  }),
  v.object({
    type: v.literal('groupEvent'),
    kind: v.union(v.literal('joined'), v.literal('left'), v.literal('ended')),
  })
);

/** One push: the same copy and data to each of these devices. */
const outgoingValidator = v.object({
  copy: v.string(),
  data: pushDataValidator,
  channelId: v.string(),
  badge: v.optional(v.number()),
  devices: v.array(deviceValidator),
});

type PushDevice = Infer<typeof deviceValidator>;
type Outgoing = Infer<typeof outgoingValidator>;

interface ExpoReceipt {
  status: 'ok' | 'error';
  details?: { error?: string };
}

interface ExpoTicket extends ExpoReceipt {
  id?: string;
}

/** The devices of a member who allows this type of push; none otherwise. */
async function devicesFor(
  ctx: QueryCtx,
  userId: string,
  type: PushType
): Promise<PushDevice[]> {
  const settings = await readMemberSettings(ctx, userId);
  if (!settings.pushNotifications || !settings[SWITCHES[type]]) return [];
  const devices = await ctx.db
    .query('deviceTokens')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  return devices.map((device) => ({
    deviceTokenId: device._id,
    token: device.token,
    userId: device.userId,
    updatedAt: device.updatedAt,
  }));
}

async function usernameOf(ctx: QueryCtx, userId: string) {
  const profile = await ctx.runQuery(components.betterAuth.users.getUser, {
    userId,
  });
  return profile?.username ?? null;
}

function isActionable(
  invite: Doc<'groupInvites'>,
  group: Doc<'groups'> | null,
  now: number
) {
  return (
    invite.delivered &&
    invite.status === 'pending' &&
    now - invite.createdAt <= INVITE_LIFETIME_MS &&
    group?.status === 'live'
  );
}

/** "sam", "sam and alex", or "sam, alex and others": never a number. */
function joinedCopy(usernames: readonly string[]) {
  const [first, second] = usernames;
  if (usernames.length === 1) return `${first} joined your Group`;
  if (usernames.length === 2) return `${first} and ${second} joined your Group`;
  return `${first}, ${second} and others joined your Group`;
}

/**
 * The invite push, if the invite can still be accepted and the invitee
 * allows invite pushes. The badge counts their actionable invites.
 */
export const getGroupInvite = internalQuery({
  args: { inviteId: v.id('groupInvites') },
  returns: v.union(outgoingValidator, v.null()),
  handler: async (ctx, { inviteId }): Promise<Outgoing | null> => {
    const now = Date.now();
    const invite = await ctx.db.get(inviteId);
    if (!invite) return null;
    if (!isActionable(invite, await ctx.db.get(invite.groupId), now)) {
      return null;
    }
    const username = await usernameOf(ctx, invite.inviterId);
    if (!username) return null;
    const pending = await ctx.db
      .query('groupInvites')
      .withIndex('by_invitee', (q) =>
        q
          .eq('inviteeId', invite.inviteeId)
          .eq('delivered', true)
          .eq('status', 'pending')
      )
      .collect();
    let badge = 0;
    for (const other of pending) {
      if (isActionable(other, await ctx.db.get(other.groupId), now)) badge++;
    }
    return {
      copy: `${username} invited you to a Group`,
      data: { type: 'groupInvite', inviteId },
      channelId: CHANNELS.invites,
      badge,
      devices: await devicesFor(ctx, invite.inviteeId, 'invites'),
    };
  },
});

/**
 * One merged push per member for the joins in a window, naming only those
 * who joined after the member did.
 */
export const getJoins = internalQuery({
  args: { groupId: v.id('groups'), from: v.number(), until: v.number() },
  returns: v.array(outgoingValidator),
  handler: async (ctx, { groupId, from, until }): Promise<Outgoing[]> => {
    const group = await ctx.db.get(groupId);
    if (group?.status !== 'live') return [];
    const joins = (
      await ctx.db
        .query('groupEvents')
        .withIndex('by_group_at', (q) =>
          q.eq('groupId', groupId).gte('at', from).lt('at', until)
        )
        .collect()
    ).filter((event) => event.kind === 'joined' && event.userId !== undefined);
    const members = await ctx.db
      .query('groupMemberships')
      .withIndex('by_group_left', (q) =>
        q.eq('groupId', groupId).eq('leftAt', undefined)
      )
      .collect();
    const usernames = new Map<string, string>();
    for (const join of joins) {
      if (join.userId && !usernames.has(join.userId)) {
        usernames.set(join.userId, (await usernameOf(ctx, join.userId)) ?? '');
      }
    }

    const outgoing: Outgoing[] = [];
    for (const member of members) {
      const names = joins.flatMap((join) =>
        join.userId !== member.userId &&
        join.at > member.joinedAt &&
        join.userId
          ? [usernames.get(join.userId) ?? '']
          : []
      );
      const named = [...new Set(names.filter(Boolean))];
      if (!named.length) continue;
      const devices = await devicesFor(ctx, member.userId, 'joins');
      if (!devices.length) continue;
      outgoing.push({
        copy: joinedCopy(named),
        data: { type: 'groupEvent', kind: 'joined' },
        channelId: CHANNELS.joins,
        devices,
      });
    }
    return outgoing;
  },
});

/** "<username> left" or "Your Group ended" for these members. */
export const getGroupEvent = internalQuery({
  args: {
    kind: v.union(v.literal('left'), v.literal('ended')),
    actorId: v.optional(v.string()),
    recipientIds: v.array(v.string()),
  },
  returns: v.union(outgoingValidator, v.null()),
  handler: async (
    ctx,
    { kind, actorId, recipientIds }
  ): Promise<Outgoing | null> => {
    let copy = 'Your Group ended';
    if (kind === 'left') {
      const username = actorId ? await usernameOf(ctx, actorId) : null;
      if (!username) return null;
      copy = `${username} left`;
    }
    const type: PushType = kind === 'left' ? 'leaves' : 'groupEnded';
    const devices: PushDevice[] = [];
    for (const userId of recipientIds) {
      if (userId !== actorId) {
        devices.push(...(await devicesFor(ctx, userId, type)));
      }
    }
    return devices.length
      ? {
          copy,
          data: { type: 'groupEvent', kind },
          channelId: CHANNELS[type],
          devices,
        }
      : null;
  },
});

/** An old receipt must not delete a token registered again since the send. */
export const deleteInvalidToken = internalMutation({
  args: { device: deviceValidator },
  returns: v.null(),
  handler: async (ctx, { device }) => {
    const current = await ctx.db.get(device.deviceTokenId);
    if (
      current?.token === device.token &&
      current.userId === device.userId &&
      current.updatedAt === device.updatedAt
    ) {
      await ctx.db.delete(current._id);
    }
    return null;
  },
});

// expo-server-sdk imports undici.fetch and node:zlib, rather than global fetch,
// and retries 429s. The HTTP API keeps Convex's runtime, fetch test seam and the
// no-retry contract intact. https://github.com/expo/expo-server-sdk-node
async function deliver(ctx: ActionCtx, outgoing: Outgoing) {
  for (
    let offset = 0;
    offset < outgoing.devices.length;
    offset += SEND_BATCH_SIZE
  ) {
    const devices = outgoing.devices.slice(offset, offset + SEND_BATCH_SIZE);
    const response = await fetch(SEND_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        devices.map((device) => ({
          to: device.token,
          title: outgoing.copy,
          body: outgoing.copy,
          sound: 'default',
          channelId: outgoing.channelId,
          data: outgoing.data,
          ...(outgoing.badge !== undefined && { badge: outgoing.badge }),
        }))
      ),
    });
    if (!response.ok) throw new ConvexError('PUSH_SERVICE_ERROR');
    const result = (await response.json()) as {
      data?: ExpoTicket[];
      errors?: unknown[];
    };
    if (
      result.errors?.length ||
      !Array.isArray(result.data) ||
      result.data.length !== devices.length
    ) {
      throw new ConvexError('PUSH_SERVICE_ERROR');
    }
    const receipts: { id: string; device: PushDevice }[] = [];
    for (const [index, ticket] of result.data.entries()) {
      const device = devices[index];
      if (!device) continue;
      if (
        ticket.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered'
      ) {
        await ctx.runMutation(internal.push.deleteInvalidToken, { device });
      } else if (ticket.status === 'ok' && ticket.id) {
        receipts.push({ id: ticket.id, device });
      }
    }
    if (receipts.length) {
      await ctx.scheduler.runAfter(
        RECEIPT_DELAY_MS,
        internal.push.checkReceipts,
        { receipts }
      );
    }
  }
}

export const sendGroupInvite = internalAction({
  args: { inviteId: v.id('groupInvites') },
  returns: v.null(),
  handler: async (ctx, { inviteId }): Promise<null> => {
    const outgoing: Outgoing | null = await ctx.runQuery(
      internal.push.getGroupInvite,
      { inviteId }
    );
    if (outgoing) await deliver(ctx, outgoing);
    return null;
  },
});

export const sendJoins = internalAction({
  args: { groupId: v.id('groups'), from: v.number(), until: v.number() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const outgoing: Outgoing[] = await ctx.runQuery(
      internal.push.getJoins,
      args
    );
    for (const push of outgoing) await deliver(ctx, push);
    return null;
  },
});

export const sendGroupEvent = internalAction({
  args: {
    kind: v.union(v.literal('left'), v.literal('ended')),
    actorId: v.optional(v.string()),
    recipientIds: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const outgoing: Outgoing | null = await ctx.runQuery(
      internal.push.getGroupEvent,
      args
    );
    if (outgoing) await deliver(ctx, outgoing);
    return null;
  },
});

export const checkReceipts = internalAction({
  args: {
    receipts: v.array(v.object({ id: v.string(), device: deviceValidator })),
  },
  returns: v.null(),
  handler: async (ctx, { receipts }): Promise<null> => {
    if (!receipts.length) return null;
    const response = await fetch(RECEIPTS_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: receipts.map((receipt) => receipt.id) }),
    });
    if (!response.ok) throw new ConvexError('PUSH_SERVICE_ERROR');
    const result = (await response.json()) as {
      data?: { [id: string]: ExpoReceipt };
      errors?: unknown[];
    };
    if (result.errors?.length || !result.data || Array.isArray(result.data)) {
      throw new ConvexError('PUSH_SERVICE_ERROR');
    }
    for (const { id, device } of receipts) {
      const receipt = result.data[id];
      if (
        receipt?.status === 'error' &&
        receipt.details?.error === 'DeviceNotRegistered'
      ) {
        await ctx.runMutation(internal.push.deleteInvalidToken, { device });
      }
    }
    return null;
  },
});
