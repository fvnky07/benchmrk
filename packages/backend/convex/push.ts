import { ConvexError, v } from 'convex/values';

import { components, internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server';

const SEND_URL = 'https://exp.host/--/api/v2/push/send';
const RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const RECEIPT_DELAY_MS = 15 * 60 * 1000;
const INVITE_LIFETIME_MS = 24 * 60 * 60 * 1000;
const SEND_BATCH_SIZE = 100;

const deviceValidator = v.object({
  deviceTokenId: v.id('deviceTokens'),
  token: v.string(),
  userId: v.string(),
  updatedAt: v.number(),
});

interface PushDevice {
  deviceTokenId: Id<'deviceTokens'>;
  token: string;
  userId: string;
  updatedAt: number;
}

interface ExpoReceipt {
  status: 'ok' | 'error';
  details?: { error?: string };
}

interface ExpoTicket extends ExpoReceipt {
  id?: string;
}

/** Only delivered, still-actionable invites may leave the inbox as a push. */
export const getGroupInvite = internalQuery({
  args: { inviteId: v.id('groupInvites') },
  returns: v.union(
    v.null(),
    v.object({ username: v.string(), devices: v.array(deviceValidator) })
  ),
  handler: async (ctx, { inviteId }) => {
    const invite = await ctx.db.get(inviteId);
    if (
      !invite?.delivered ||
      invite.status !== 'pending' ||
      Date.now() - invite.createdAt > INVITE_LIFETIME_MS
    ) {
      return null;
    }
    const group = await ctx.db.get(invite.groupId);
    if (group?.status !== 'live') return null;
    const inviter = await ctx.runQuery(components.betterAuth.users.getUser, {
      userId: invite.inviterId,
    });
    if (!inviter?.username) return null;
    const devices = await ctx.db
      .query('deviceTokens')
      .withIndex('by_user', (q) => q.eq('userId', invite.inviteeId))
      .collect();
    return {
      username: inviter.username,
      devices: devices.map((device) => ({
        deviceTokenId: device._id,
        token: device.token,
        userId: device.userId,
        updatedAt: device.updatedAt,
      })),
    };
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
export const sendGroupInvite = internalAction({
  args: { inviteId: v.id('groupInvites') },
  returns: v.null(),
  handler: async (ctx, { inviteId }): Promise<null> => {
    const invite: { username: string; devices: PushDevice[] } | null =
      await ctx.runQuery(internal.push.getGroupInvite, { inviteId });
    if (!invite) return null;
    const copy = `${invite.username} invited you to a Group`;
    for (
      let offset = 0;
      offset < invite.devices.length;
      offset += SEND_BATCH_SIZE
    ) {
      const devices = invite.devices.slice(offset, offset + SEND_BATCH_SIZE);
      const response = await fetch(SEND_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          devices.map((device) => ({
            to: device.token,
            title: copy,
            body: copy,
            sound: 'default',
            channelId: 'group-invites',
            data: { type: 'groupInvite', inviteId },
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
