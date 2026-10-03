import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, internal } from '../_generated/api';
import {
  createAuthIdentity,
  createTest,
  type TestBackend,
  type TestMember,
} from './harness.testing';
import {
  finishDue,
  type PushMessage,
  pushService,
} from './pushService.testing';
import { useWorkoutClock } from './workoutFixtures.testing';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

beforeEach(useWorkoutClock);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const tokenOf = (username: string) => `ExpoPushToken[${username}]`;

/** A verified member with a username and one registered device. */
async function member(t: TestBackend, username: string): Promise<TestMember> {
  const identityId = await createAuthIdentity(t, {
    email: `${username}@example.com`,
    emailVerified: true,
  });
  const signedIn = t.withIdentity({ subject: identityId });
  await signedIn.mutation(api.profile.updateProfile, { username });
  await signedIn.mutation(api.deviceTokens.register, {
    token: tokenOf(username),
    platform: 'ios',
  });
  return signedIn;
}

/** What each member's device received, as the copy it showed. */
function received(messages: readonly PushMessage[], username: string) {
  return messages
    .filter((message) => message.to === tokenOf(username))
    .map((message) => message.body);
}

/** A host's Group, with its own join window already closed. */
async function groupOf(t: TestBackend, hostName: string) {
  const host = await member(t, hostName);
  await host.mutation(api.groups.create, {});
  const { code } = await host.mutation(api.groups.shareCode, {});
  await finishDue(t, 5 * MINUTE);
  return { host, code };
}

describe('Group event pushes', () => {
  test('Group events stay in a recipient’s inbox after ending leaves them outside the Group', async () => {
    const t = createTest();
    pushService();
    const { host, code } = await groupOf(t, 'host');
    const sam = await member(t, 'sam');
    const alex = await member(t, 'alex');
    const outsider = await member(t, 'outsider');
    await sam.mutation(api.groups.joinByCode, { code });
    await alex.mutation(api.groups.joinByCode, { code });
    await sam.mutation(api.groups.leave, {});
    await host.mutation(api.groups.end, {});

    expect(await alex.query(api.groups.getMine, {})).toBeNull();
    const entries = await alex.query(api.groupInvites.eventInbox, {});
    expect(entries.map((entry) => entry.copy)).toEqual([
      'Your Group ended',
      'sam left',
    ]);
    expect(
      (await host.query(api.groupInvites.eventInbox, {})).map(
        (entry) => entry.copy
      )
    ).toEqual(['sam left', 'alex joined your Group', 'sam joined your Group']);
    expect(
      (await sam.query(api.groupInvites.eventInbox, {})).map(
        (entry) => entry.copy
      )
    ).toEqual(['alex joined your Group']);
    expect(await outsider.query(api.groupInvites.eventInbox, {})).toEqual([]);

    const ended = entries.find((entry) => entry.copy === 'Your Group ended');
    if (!ended) throw new Error('Missing ended Group inbox entry');
    await expect(
      outsider.mutation(api.groupInvites.dismissEvent, {
        entryId: ended.entryId,
      })
    ).rejects.toThrow('INBOX_ENTRY_NOT_FOUND');
    await alex.mutation(api.groupInvites.dismissEvent, {
      entryId: ended.entryId,
    });
    expect(
      (await alex.query(api.groupInvites.eventInbox, {})).map(
        (entry) => entry.copy
      )
    ).toEqual(['sam left']);
  });

  test('joins within 60 s merge into one push; the joiners hear only of later joins', async () => {
    const t = createTest();
    const service = pushService();
    const { code } = await groupOf(t, 'host');
    const sam = await member(t, 'sam');
    const alex = await member(t, 'alex');
    const joe = await member(t, 'joe');

    await sam.mutation(api.groups.joinByCode, { code });
    await finishDue(t, 30 * SECOND);
    await alex.mutation(api.groups.joinByCode, { code });
    await finishDue(t, 30 * SECOND);

    expect(received(service.messages, 'host')).toEqual([
      'sam and alex joined your Group',
    ]);
    expect(received(service.messages, 'sam')).toEqual([
      'alex joined your Group',
    ]);
    expect(received(service.messages, 'alex')).toEqual([]);

    await finishDue(t, SECOND);
    await joe.mutation(api.groups.joinByCode, { code });
    await finishDue(t, MINUTE);

    expect(received(service.messages, 'host')).toEqual([
      'sam and alex joined your Group',
      'joe joined your Group',
    ]);
    expect(received(service.messages, 'alex')).toEqual([
      'joe joined your Group',
    ]);
    expect(received(service.messages, 'joe')).toEqual([]);
    expect(
      service.messages.every(
        (message) =>
          message.title === message.body &&
          message.data.type === 'groupEvent' &&
          message.data.kind === 'joined'
      )
    ).toBe(true);
  });

  test('“<username> left” goes to those still there; the host’s end reaches everyone else', async () => {
    const t = createTest();
    const service = pushService();
    const { host, code } = await groupOf(t, 'host');
    const sam = await member(t, 'sam');
    const alex = await member(t, 'alex');
    await sam.mutation(api.groups.joinByCode, { code });
    await alex.mutation(api.groups.joinByCode, { code });
    await finishDue(t, 2 * MINUTE);
    service.messages.length = 0;

    await sam.mutation(api.groups.leave, {});
    await finishDue(t);
    expect(received(service.messages, 'host')).toEqual(['sam left']);
    expect(received(service.messages, 'alex')).toEqual(['sam left']);
    expect(received(service.messages, 'sam')).toEqual([]);

    service.messages.length = 0;
    await host.mutation(api.groups.end, {});
    await finishDue(t);
    expect(received(service.messages, 'alex')).toEqual(['Your Group ended']);
    expect(received(service.messages, 'host')).toEqual([]);
    expect(received(service.messages, 'sam')).toEqual([]);
  });

  test('an idle end tells every member, the host included', async () => {
    const t = createTest();
    const service = pushService();
    const { code } = await groupOf(t, 'host');
    const sam = await member(t, 'sam');
    await sam.mutation(api.groups.joinByCode, { code });
    await finishDue(t, 2 * MINUTE);
    service.messages.length = 0;

    await finishDue(t, 4 * HOUR);
    await t.mutation(internal.groupSweeps.sweep, {});
    await finishDue(t);

    expect(received(service.messages, 'host')).toEqual(['Your Group ended']);
    expect(received(service.messages, 'sam')).toEqual(['Your Group ended']);
  });

  test('the global switch silences everything; a type switch only its type', async () => {
    const t = createTest();
    const service = pushService();
    const { host, code } = await groupOf(t, 'host');
    await host.mutation(api.memberSettings.update, { pushJoins: false });
    const quiet = await member(t, 'quiet');
    await quiet.mutation(api.memberSettings.update, {
      pushNotifications: false,
    });
    const sam = await member(t, 'sam');
    await quiet.mutation(api.groups.joinByCode, { code });
    await sam.mutation(api.groups.joinByCode, { code });
    await finishDue(t, 2 * MINUTE);

    await sam.mutation(api.groups.leave, {});
    await finishDue(t);

    expect(received(service.messages, 'host')).toEqual(['sam left']);
    expect(received(service.messages, 'quiet')).toEqual([]);

    const kim = await member(t, 'kim');
    const lee = await member(t, 'lee');
    await lee.mutation(api.memberSettings.update, { pushInvites: false });
    await host.mutation(api.groupInvites.send, { username: 'kim' });
    await host.mutation(api.groupInvites.send, { username: 'lee' });
    await finishDue(t);

    expect(received(service.messages, 'kim')).toEqual([
      'host invited you to a Group',
    ]);
    expect(
      service.messages.find((message) => message.to === tokenOf('kim'))?.badge
    ).toBe(1);
    expect(received(service.messages, 'lee')).toEqual([]);
    expect(await kim.query(api.groupInvites.inbox, {})).toHaveLength(1);
    expect(await lee.query(api.groupInvites.inbox, {})).toHaveLength(1);
  });
});
