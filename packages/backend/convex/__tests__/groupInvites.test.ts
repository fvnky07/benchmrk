import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, internal } from '../_generated/api';
import {
  createAuthIdentity,
  createTest,
  type TestBackend,
  type TestMember,
} from './harness.testing';
import { START, useWorkoutClock } from './workoutFixtures.testing';

const HOUR = 60 * 60 * 1000;

beforeEach(useWorkoutClock);

afterEach(() => {
  vi.useRealTimers();
});

async function backend() {
  const t = createTest();
  await t.mutation(internal.init.seed, {});
  return t;
}

/** A member with a verified email (unless asked otherwise) and a username. */
async function member(
  t: TestBackend,
  username: string,
  { verified = true }: { verified?: boolean } = {}
): Promise<TestMember> {
  const identityId = await createAuthIdentity(t, {
    email: `${username}@example.com`,
    emailVerified: verified,
  });
  const signedIn = t.withIdentity({ subject: identityId });
  await signedIn.mutation(api.profile.updateProfile, { username });
  return signedIn;
}

async function hostInGroup(t: TestBackend) {
  const host = await member(t, 'host');
  await host.mutation(api.groups.create, {});
  return host;
}

/** The invitee's one inbox entry. */
async function onlyInvite(invitee: TestMember) {
  const entries = await invitee.query(api.groupInvites.inbox, {});
  const [invite] = entries;
  if (!invite || entries.length !== 1) {
    throw new Error(`expected one invite, got ${entries.length}`);
  }
  return invite;
}

describe('Group invites', () => {
  test('an invite reaches only the member with that exact username', async () => {
    const t = await backend();
    const host = await hostInGroup(t);
    const lifter = await member(t, 'lifter');

    await expect(
      host.mutation(api.groupInvites.send, { username: 'lift' })
    ).rejects.toThrow('NO_SUCH_USERNAME');
    await host.mutation(api.groupInvites.send, { username: 'Lifter ' });

    expect(await lifter.query(api.groupInvites.inbox, {})).toEqual([
      {
        inviteId: expect.any(String),
        inviterUsername: 'host',
        sentAt: START,
        state: 'pending',
      },
    ]);
  });

  test('only Group members can invite, and never someone already in the Group', async () => {
    const t = await backend();
    const host = await hostInGroup(t);
    const outsider = await member(t, 'outsider');

    await expect(
      outsider.mutation(api.groupInvites.send, { username: 'host' })
    ).rejects.toThrow('NOT_IN_GROUP');
    await expect(
      host.mutation(api.groupInvites.send, { username: 'host' })
    ).rejects.toThrow('ALREADY_IN_GROUP');
  });

  test('“nobody” and unverified invitees get nothing, yet the invite looks sent', async () => {
    const t = await backend();
    const host = await hostInGroup(t);
    const private_ = await member(t, 'private');
    await private_.mutation(api.memberSettings.update, {
      invitesFrom: 'nobody',
    });
    const unverified = await member(t, 'newbie', { verified: false });
    const open = await member(t, 'open');

    const delivered = await host.mutation(api.groupInvites.send, {
      username: 'open',
    });
    const refused = await host.mutation(api.groupInvites.send, {
      username: 'private',
    });
    const unreceived = await host.mutation(api.groupInvites.send, {
      username: 'newbie',
    });

    expect(refused).toEqual(delivered);
    expect(unreceived).toEqual(delivered);
    expect(await open.query(api.groupInvites.inbox, {})).toHaveLength(1);
    expect(await private_.query(api.groupInvites.inbox, {})).toEqual([]);
    expect(await unverified.query(api.groupInvites.inbox, {})).toEqual([]);
  });

  test('“people I’ve been in a Group with” lets in past Group members only', async () => {
    const t = await backend();
    const host = await hostInGroup(t);
    const picky = await member(t, 'picky');
    await picky.mutation(api.memberSettings.update, {
      invitesFrom: 'groupmates',
    });
    const stranger = await member(t, 'stranger');
    await stranger.mutation(api.groups.create, {});

    await stranger.mutation(api.groupInvites.send, { username: 'picky' });
    expect(await picky.query(api.groupInvites.inbox, {})).toEqual([]);

    // picky trains with host once, then leaves.
    const { code } = await host.mutation(api.groups.shareCode, {});
    await picky.mutation(api.groups.joinByCode, { code });
    vi.setSystemTime(START + 30 * 60 * 1000);
    await picky.mutation(api.groups.leave, {});

    await host.mutation(api.groupInvites.send, { username: 'picky' });
    expect(await picky.query(api.groupInvites.inbox, {})).toEqual([
      expect.objectContaining({ inviterUsername: 'host', state: 'pending' }),
    ]);
  });

  test('members who were in the same Group at different times aren’t groupmates', async () => {
    const t = await backend();
    const host = await hostInGroup(t);
    const { code } = await host.mutation(api.groups.shareCode, {});
    const early = await member(t, 'early');
    await early.mutation(api.memberSettings.update, {
      invitesFrom: 'groupmates',
    });
    await early.mutation(api.groups.joinByCode, { code });
    vi.setSystemTime(START + 10 * 60 * 1000);
    await early.mutation(api.groups.leave, {});
    vi.setSystemTime(START + 20 * 60 * 1000);
    const late = await member(t, 'late');
    await late.mutation(api.groups.joinByCode, { code });

    await late.mutation(api.groupInvites.send, { username: 'early' });

    expect(await early.query(api.groupInvites.inbox, {})).toEqual([]);
  });

  test('an invite lasts 24 hours or until the Group ends', async () => {
    const t = await backend();
    const host = await hostInGroup(t);
    const late = await member(t, 'late');
    const ended = await member(t, 'ended');
    await host.mutation(api.groupInvites.send, { username: 'late' });

    vi.setSystemTime(START + 24 * HOUR + 1);
    const expired = await onlyInvite(late);
    expect(expired.state).toBe('expired');
    await expect(
      late.mutation(api.groupInvites.accept, {
        inviteId: expired.inviteId,
      })
    ).rejects.toThrow('INVITE_EXPIRED');

    await host.mutation(api.groupInvites.send, { username: 'ended' });
    await host.mutation(api.groups.end, {});
    const afterEnd = await onlyInvite(ended);
    expect(afterEnd.state).toBe('ended');
    await expect(
      ended.mutation(api.groupInvites.accept, {
        inviteId: afterEnd.inviteId,
      })
    ).rejects.toThrow('GROUP_ENDED');
  });

  test('an inviter can send at most 10 invites an hour', async () => {
    const t = await backend();
    const host = await hostInGroup(t);
    for (let index = 0; index < 11; index += 1) {
      await member(t, `lifter${index}`);
    }
    for (let index = 0; index < 10; index += 1) {
      await host.mutation(api.groupInvites.send, {
        username: `lifter${index}`,
      });
    }

    await expect(
      host.mutation(api.groupInvites.send, { username: 'lifter10' })
    ).rejects.toThrow('INVITE_LIMIT');

    vi.setSystemTime(START + HOUR + 1);
    await host.mutation(api.groupInvites.send, { username: 'lifter10' });
  });

  test('after a decline, the inviter can’t invite that member again for an hour', async () => {
    const t = await backend();
    const host = await hostInGroup(t);
    const busy = await member(t, 'busy');
    await host.mutation(api.groupInvites.send, { username: 'busy' });
    const invite = await onlyInvite(busy);
    await busy.mutation(api.groupInvites.decline, {
      inviteId: invite.inviteId,
    });
    expect(await busy.query(api.groupInvites.inbox, {})).toEqual([]);

    await expect(
      host.mutation(api.groupInvites.send, { username: 'busy' })
    ).rejects.toThrow('INVITE_COOLDOWN');

    vi.setSystemTime(START + HOUR + 1);
    await host.mutation(api.groupInvites.send, { username: 'busy' });
    expect(await busy.query(api.groupInvites.inbox, {})).toHaveLength(1);
  });

  test('accepting joins the Group under the normal join rules', async () => {
    const t = await backend();
    const host = await hostInGroup(t);
    const guest = await member(t, 'guest');
    const taken = await member(t, 'taken');
    await host.mutation(api.groupInvites.send, { username: 'guest' });
    await host.mutation(api.groupInvites.send, { username: 'taken' });
    await taken.mutation(api.groups.create, {});

    const forTaken = await onlyInvite(taken);
    await expect(
      taken.mutation(api.groupInvites.accept, {
        inviteId: forTaken.inviteId,
      })
    ).rejects.toThrow('IN_ANOTHER_GROUP');

    const forGuest = await onlyInvite(guest);
    await guest.mutation(api.groupInvites.accept, {
      inviteId: forGuest.inviteId,
    });
    const group = await guest.query(api.groups.getMine, {});
    expect(group?.members.map((box) => box.username)).toEqual([
      'guest',
      'host',
    ]);
    expect(await guest.query(api.groupInvites.inbox, {})).toEqual([]);
  });

  test('accepting is refused when the Group is full', async () => {
    const t = await backend();
    const host = await hostInGroup(t);
    const invitee = await member(t, 'invitee');
    await host.mutation(api.groupInvites.send, { username: 'invitee' });
    const { code } = await host.mutation(api.groups.shareCode, {});
    for (let index = 1; index < 20; index += 1) {
      await (await member(t, `lifter${index}`)).mutation(
        api.groups.joinByCode,
        { code }
      );
    }

    const invite = await onlyInvite(invitee);
    await expect(
      invitee.mutation(api.groupInvites.accept, {
        inviteId: invite.inviteId,
      })
    ).rejects.toThrow('GROUP_FULL');
  });

  test('only the invitee can answer their invite', async () => {
    const t = await backend();
    const host = await hostInGroup(t);
    const guest = await member(t, 'guest');
    const snoop = await member(t, 'snoop');
    await host.mutation(api.groupInvites.send, { username: 'guest' });
    const invite = await onlyInvite(guest);

    await expect(
      snoop.mutation(api.groupInvites.accept, {
        inviteId: invite.inviteId,
      })
    ).rejects.toThrow('INVITE_NOT_FOUND');
  });
});
