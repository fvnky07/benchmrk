import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api } from '../_generated/api';
import {
  createAuthIdentity,
  createTest,
  type TestBackend,
  type TestMember,
} from './harness.testing';
import { START, useWorkoutClock } from './workoutFixtures.testing';

const SEND_URL = 'https://exp.host/--/api/v2/push/send';
const RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const RECEIPT_DELAY = 15 * 60 * 1000;
const PHONE = 'ExpoPushToken[phone]';
const TABLET = 'ExpoPushToken[tablet]';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: string;
  channelId: string;
  data: { type: string; inviteId: string };
}
interface PushReceipt {
  status: 'ok' | 'error';
  details?: { error: string };
}

beforeEach(useWorkoutClock);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function member(
  t: TestBackend,
  username: string,
  verified = true
): Promise<TestMember> {
  const identityId = await createAuthIdentity(t, {
    email: `${username}@example.com`,
    emailVerified: verified,
  });
  const signedIn = t.withIdentity({ subject: identityId });
  await signedIn.mutation(api.profile.updateProfile, { username });
  return signedIn;
}

async function host(t: TestBackend, username: string) {
  const signedIn = await member(t, username);
  await signedIn.mutation(api.groups.create, {});
  return signedIn;
}

/** Stub only the remote service; all identity, invite and token functions are real. */
function pushService({
  invalidTicketToken,
  invalidReceiptToken,
}: {
  invalidTicketToken?: string;
  invalidReceiptToken?: string;
} = {}) {
  const messages: PushMessage[] = [];
  const receiptRequests: string[][] = [];
  const receipts: { [id: string]: PushReceipt } = {};
  let nextReceipt = 0;
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof init?.body !== 'string')
        throw new Error('Expected JSON push body');
      if (String(input) === SEND_URL) {
        const batch = JSON.parse(init.body) as PushMessage[];
        messages.push(...batch);
        const data = batch.map((message) => {
          if (message.to === invalidTicketToken) {
            return {
              status: 'error',
              details: { error: 'DeviceNotRegistered' },
            };
          }
          const id = `receipt-${nextReceipt++}`;
          receipts[id] =
            message.to === invalidReceiptToken
              ? { status: 'error', details: { error: 'DeviceNotRegistered' } }
              : { status: 'ok' };
          return { status: 'ok', id };
        });
        return new Response(JSON.stringify({ data }), { status: 200 });
      }
      if (String(input) === RECEIPTS_URL) {
        const { ids } = JSON.parse(init.body) as { ids: string[] };
        receiptRequests.push(ids);
        const data = Object.fromEntries(ids.map((id) => [id, receipts[id]]));
        return new Response(JSON.stringify({ data }), { status: 200 });
      }
      throw new Error(`Unexpected external request: ${String(input)}`);
    }
  );
  vi.stubGlobal('fetch', fetchMock);
  return { messages, receiptRequests, fetchMock };
}

async function finishDue(t: TestBackend, milliseconds = 0) {
  await vi.advanceTimersByTimeAsync(milliseconds);
  await t.finishInProgressScheduledFunctions();
}

async function twoDevices(invitee: TestMember) {
  await invitee.mutation(api.deviceTokens.register, {
    token: PHONE,
    platform: 'ios',
  });
  await invitee.mutation(api.deviceTokens.register, {
    token: TABLET,
    platform: 'android',
  });
}

describe('Group invite push', () => {
  test('sends exactly one message per invitee device with fixed copy and inbox data', async () => {
    const t = createTest();
    const service = pushService();
    const inviter = await host(t, 'spotter');
    const invitee = await member(t, 'lifter');
    const other = await member(t, 'other');
    await twoDevices(invitee);
    // App-start registration is an upsert, not another delivery destination.
    await invitee.mutation(api.deviceTokens.register, {
      token: PHONE,
      platform: 'ios',
    });
    await other.mutation(api.deviceTokens.register, {
      token: 'ExpoPushToken[other]',
      platform: 'ios',
    });

    await inviter.mutation(api.groupInvites.send, { username: 'lifter' });
    const [invite] = await invitee.query(api.groupInvites.inbox, {});
    await finishDue(t);

    expect(
      service.messages
        .map(({ to, title, body, data }) => ({ to, title, body, data }))
        .sort((a, b) => a.to.localeCompare(b.to))
    ).toEqual(
      [PHONE, TABLET].map((token) => ({
        to: token,
        title: 'spotter invited you to a Group',
        body: 'spotter invited you to a Group',
        data: { type: 'groupInvite', inviteId: invite?.inviteId },
      }))
    );
    expect(service.receiptRequests).toEqual([]);
  });

  test('a DeviceNotRegistered ticket removes only the invalid device', async () => {
    const t = createTest();
    const service = pushService({ invalidTicketToken: PHONE });
    const first = await host(t, 'first');
    const second = await host(t, 'second');
    const invitee = await member(t, 'lifter');
    await twoDevices(invitee);

    await first.mutation(api.groupInvites.send, { username: 'lifter' });
    await finishDue(t);
    service.messages.length = 0;
    await second.mutation(api.groupInvites.send, { username: 'lifter' });
    await finishDue(t);

    expect(service.messages.map((message) => message.to)).toEqual([TABLET]);
  });

  test('a DeviceNotRegistered receipt removes only its token after the receipt delay', async () => {
    const t = createTest();
    const service = pushService({ invalidReceiptToken: PHONE });
    const first = await host(t, 'first');
    const invitee = await member(t, 'lifter');
    await twoDevices(invitee);

    await first.mutation(api.groupInvites.send, { username: 'lifter' });
    await finishDue(t);
    await finishDue(t, RECEIPT_DELAY);
    const second = await host(t, 'second');
    service.messages.length = 0;
    await second.mutation(api.groupInvites.send, { username: 'lifter' });
    await finishDue(t);

    expect(service.messages.map((message) => message.to)).toEqual([TABLET]);
  });

  test('unregister removes the caller’s token, never another identity’s token', async () => {
    const t = createTest();
    const service = pushService();
    const inviter = await host(t, 'spotter');
    const invitee = await member(t, 'lifter');
    const other = await member(t, 'other');
    await twoDevices(invitee);

    await other.mutation(api.deviceTokens.unregister, { token: PHONE });
    await invitee.mutation(api.deviceTokens.unregister, { token: TABLET });
    await inviter.mutation(api.groupInvites.send, { username: 'lifter' });
    await finishDue(t);

    expect(service.messages.map((message) => message.to)).toEqual([PHONE]);
  });

  test('a token reassigned at sign-in sends only to its new identity', async () => {
    const t = createTest();
    const service = pushService();
    const inviter = await host(t, 'spotter');
    const first = await member(t, 'first');
    const second = await member(t, 'second');
    await first.mutation(api.deviceTokens.register, {
      token: PHONE,
      platform: 'ios',
    });
    await second.mutation(api.deviceTokens.register, {
      token: PHONE,
      platform: 'ios',
    });
    await first.mutation(api.deviceTokens.unregister, { token: PHONE });

    await inviter.mutation(api.groupInvites.send, { username: 'first' });
    await finishDue(t);
    expect(service.messages).toEqual([]);
    await inviter.mutation(api.groupInvites.send, { username: 'second' });
    await finishDue(t);
    expect(service.messages.map((message) => message.to)).toEqual([PHONE]);
  });

  test('an old invalid receipt cannot remove a freshly registered token', async () => {
    const t = createTest();
    const service = pushService({ invalidReceiptToken: PHONE });
    const first = await host(t, 'first');
    const invitee = await member(t, 'lifter');
    await invitee.mutation(api.deviceTokens.register, {
      token: PHONE,
      platform: 'ios',
    });
    await first.mutation(api.groupInvites.send, { username: 'lifter' });
    await finishDue(t);

    vi.setSystemTime(START + 1000);
    await invitee.mutation(api.deviceTokens.register, {
      token: PHONE,
      platform: 'ios',
    });
    await finishDue(t, RECEIPT_DELAY);
    const second = await host(t, 'second');
    service.messages.length = 0;
    await second.mutation(api.groupInvites.send, { username: 'lifter' });
    await finishDue(t);
    expect(service.messages.map((message) => message.to)).toEqual([PHONE]);
  });

  test('“nobody” and unverified invitees get neither an inbox entry nor a push', async () => {
    const t = createTest();
    const service = pushService();
    const inviter = await host(t, 'spotter');
    const privateMember = await member(t, 'private');
    const unverified = await member(t, 'unverified', false);
    await privateMember.mutation(api.memberSettings.update, {
      invitesFrom: 'nobody',
    });
    await privateMember.mutation(api.deviceTokens.register, {
      token: PHONE,
      platform: 'ios',
    });
    await unverified.mutation(api.deviceTokens.register, {
      token: TABLET,
      platform: 'android',
    });

    await expect(
      inviter.mutation(api.groupInvites.send, { username: 'private' })
    ).resolves.toBeNull();
    await expect(
      inviter.mutation(api.groupInvites.send, { username: 'unverified' })
    ).resolves.toBeNull();
    await finishDue(t);
    expect(await privateMember.query(api.groupInvites.inbox, {})).toEqual([]);
    expect(await unverified.query(api.groupInvites.inbox, {})).toEqual([]);
    expect(service.fetchMock).not.toHaveBeenCalled();
  });
});
