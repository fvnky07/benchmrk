import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, internal } from '../_generated/api';
import {
  createAuthIdentity,
  createTest,
  type TestBackend,
  type TestMember,
} from './harness.testing';
import { finishDue, pushService } from './pushService.testing';
import {
  activeWorkout,
  exerciseId,
  START,
  useWorkoutClock,
} from './workoutFixtures.testing';

beforeEach(useWorkoutClock);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

type Member = { client: TestMember; id: string; username: string };

async function member(t: TestBackend, username: string): Promise<Member> {
  const id = await createAuthIdentity(t, {
    email: `${username}@example.com`,
    emailVerified: true,
  });
  const client = t.withIdentity({ subject: id });
  await client.mutation(api.profile.updateProfile, { username });
  await client.mutation(api.deviceTokens.register, {
    token: `ExpoPushToken[${username}]`,
    platform: 'ios',
  });
  return { client, id, username };
}

async function group(t: TestBackend) {
  const host = await member(t, 'host');
  const groupId = await host.client.mutation(api.groups.create, {});
  const { code } = await host.client.mutation(api.groups.shareCode, {});
  return { host, groupId, code };
}

async function startWorkout(t: TestBackend, client: TestMember) {
  await t.mutation(internal.init.seed, {});
  const routineId = await client.mutation(api.routines.create, {
    name: 'Push',
  });
  await client.mutation(api.routines.addExercise, {
    routineId,
    exerciseId: await exerciseId(t, 'bench-press'),
  });
  return client.mutation(api.workouts.start, { routineId });
}

async function visibleNames(client: TestMember) {
  return (await client.query(api.groups.getMine, {}))?.members.map(
    (box) => box.username
  );
}

describe('Group safety', () => {
  test.each(['sender', 'invitee'] as const)(
    '%s blocking silently drops the invite and its push',
    async (direction) => {
      const t = createTest();
      const service = pushService();
      const { host } = await group(t);
      const guest = await member(t, 'guest');
      await finishDue(t, 60_000);
      service.messages.length = 0;
      const blocker = direction === 'sender' ? host : guest;
      const blocked = direction === 'sender' ? guest : host;
      await blocker.client.mutation(api.safety.block, {
        username: blocked.username,
      });

      expect(
        await host.client.mutation(api.groupInvites.send, { username: 'guest' })
      ).toBeNull();
      expect(await guest.client.query(api.groupInvites.inbox, {})).toEqual([]);
      await finishDue(t);
      expect(service.messages).toEqual([]);
    }
  );

  test.each(['joiner', 'resident'] as const)(
    'a code join refuses a block by the %s against any current member',
    async (direction) => {
      const t = createTest();
      const { code } = await group(t);
      const resident = await member(t, 'resident');
      const joiner = await member(t, 'joiner');
      await resident.client.mutation(api.groups.joinByCode, { code });
      const blocker = direction === 'joiner' ? joiner : resident;
      const blocked = direction === 'joiner' ? resident : joiner;
      await blocker.client.mutation(api.safety.block, {
        username: blocked.username,
      });

      await expect(
        joiner.client.mutation(api.groups.joinByCode, { code })
      ).rejects.toThrow('JOIN_REFUSED');
      expect(await joiner.client.query(api.groups.getMine, {})).toBeNull();
      await blocker.client.mutation(api.safety.unblock, {
        username: blocked.username,
      });
      await joiner.client.mutation(api.groups.joinByCode, { code });
      expect(await visibleNames(joiner.client)).toEqual([
        'joiner',
        'host',
        'resident',
      ]);
    }
  );

  test('invite acceptance shares the block check after an invite was delivered', async () => {
    const t = createTest();
    const { host } = await group(t);
    const guest = await member(t, 'guest');
    await host.client.mutation(api.groupInvites.send, { username: 'guest' });
    const [invite] = await guest.client.query(api.groupInvites.inbox, {});
    if (!invite) throw new Error('Missing delivered invite');
    await guest.client.mutation(api.safety.block, { username: 'host' });

    await expect(
      guest.client.mutation(api.groupInvites.accept, {
        inviteId: invite.inviteId,
      })
    ).rejects.toThrow('JOIN_REFUSED');
  });

  test('only the host removes; the Workout survives and removal bars only that Group', async () => {
    const t = createTest();
    const service = pushService();
    const { host, code, groupId } = await group(t);
    const guest = await member(t, 'guest');
    const outsider = await member(t, 'outsider');
    await guest.client.mutation(api.groups.joinByCode, { code });
    const workoutId = await startWorkout(t, guest.client);
    await finishDue(t, 60_000);
    service.messages.length = 0;

    await expect(
      outsider.client.mutation(api.groups.remove, { username: 'guest' })
    ).rejects.toThrow('NOT_IN_GROUP');
    await expect(
      guest.client.mutation(api.groups.remove, { username: 'host' })
    ).rejects.toThrow('NOT_HOST');
    await expect(
      host.client.mutation(api.groups.remove, { username: 'host' })
    ).rejects.toThrow('MEMBER_NOT_FOUND');
    await expect(
      host.client.mutation(api.groups.remove, { username: 'outsider' })
    ).rejects.toThrow('MEMBER_NOT_FOUND');

    expect(
      await host.client.mutation(api.groups.remove, { username: 'guest' })
    ).toBeNull();
    expect(await guest.client.query(api.groups.getMine, {})).toBeNull();
    expect((await activeWorkout(guest.client))._id).toBe(workoutId);
    expect(await visibleNames(host.client)).toEqual(['host']);
    await finishDue(t);
    expect(service.messages).toEqual([]);
    await expect(
      guest.client.mutation(api.groups.joinByCode, { code })
    ).rejects.toThrow('REMOVED_FROM_GROUP');
    const anotherGroupId = await guest.client.mutation(api.groups.create, {});
    expect(anotherGroupId).not.toBe(groupId);
    expect((await guest.client.query(api.groups.getMine, {}))?.isHost).toBe(
      true
    );
    expect((await activeWorkout(guest.client))._id).toBe(workoutId);
  });

  test('reports record the reporter, reported member, shared Group and reason', async () => {
    const t = createTest();
    const { host, code, groupId } = await group(t);
    const guest = await member(t, 'guest');
    await guest.client.mutation(api.groups.joinByCode, { code });
    vi.setSystemTime(START + 1000);

    expect(
      await host.client.mutation(api.safety.report, {
        username: 'guest',
        reason: 'harassment',
      })
    ).toBeNull();
    const reports = await t.run((ctx) => ctx.db.query('reports').collect());
    expect(reports).toMatchObject([
      {
        reporterId: host.id,
        reportedId: guest.id,
        groupId,
        reason: 'harassment',
        createdAt: START + 1000,
      },
    ]);
  });

  test.each(['host', 'guest'] as const)(
    'a block by %s hides both boxes only from each other and unblock restores them',
    async (direction) => {
      const t = createTest();
      const { host, code } = await group(t);
      const guest = await member(t, 'guest');
      const observer = await member(t, 'observer');
      await guest.client.mutation(api.groups.joinByCode, { code });
      vi.setSystemTime(START + 1000);
      await observer.client.mutation(api.groups.joinByCode, { code });
      const blocker = direction === 'host' ? host : guest;
      const blocked = direction === 'host' ? guest : host;
      await blocker.client.mutation(api.safety.block, {
        username: blocked.username,
      });

      expect(await visibleNames(host.client)).toEqual(['host', 'observer']);
      expect(await visibleNames(guest.client)).toEqual(['guest', 'observer']);
      expect(await visibleNames(observer.client)).toEqual([
        'observer',
        'host',
        'guest',
      ]);
      await blocker.client.mutation(api.safety.unblock, {
        username: blocked.username,
      });
      expect(await visibleNames(host.client)).toEqual([
        'host',
        'guest',
        'observer',
      ]);
      expect(await visibleNames(guest.client)).toEqual([
        'guest',
        'host',
        'observer',
      ]);
    }
  );

  test('the private block list is newest first and blocking is idempotent', async () => {
    const t = createTest();
    const host = await member(t, 'host');
    await member(t, 'guest');
    const other = await member(t, 'other');
    await host.client.mutation(api.safety.block, { username: 'guest' });
    vi.setSystemTime(START + 1000);
    await host.client.mutation(api.safety.block, { username: 'other' });
    vi.setSystemTime(START + 2000);
    await host.client.mutation(api.safety.block, { username: 'guest' });

    expect(await host.client.query(api.safety.blocked, {})).toEqual([
      { username: 'other', blockedAt: START + 1000 },
      { username: 'guest', blockedAt: START },
    ]);
    expect(await other.client.query(api.safety.blocked, {})).toEqual([]);
    await host.client.mutation(api.safety.unblock, { username: 'guest' });
    expect(await host.client.query(api.safety.blocked, {})).toEqual([
      { username: 'other', blockedAt: START + 1000 },
    ]);
    await expect(
      host.client.mutation(api.safety.block, { username: 'host' })
    ).rejects.toThrow('CANNOT_BLOCK_SELF');
    await expect(
      host.client.mutation(api.safety.block, { username: 'missing' })
    ).rejects.toThrow('NO_SUCH_USERNAME');
    await expect(
      host.client.mutation(api.safety.unblock, { username: 'missing' })
    ).rejects.toThrow('NO_SUCH_USERNAME');
  });

  test('reports outside a shared Group omit the Group and reject self or missing members', async () => {
    const t = createTest();
    const { host } = await group(t);
    const guest = await member(t, 'guest');
    await host.client.mutation(api.safety.report, {
      username: 'guest',
      reason: 'spam',
    });
    const reports = await t.run((ctx) => ctx.db.query('reports').collect());
    expect(reports).toMatchObject([
      { reporterId: host.id, reportedId: guest.id, reason: 'spam' },
    ]);
    expect(reports[0]?.groupId).toBeUndefined();
    await expect(
      host.client.mutation(api.safety.report, {
        username: 'host',
        reason: 'other',
      })
    ).rejects.toThrow('CANNOT_REPORT_SELF');
    await expect(
      host.client.mutation(api.safety.report, {
        username: 'missing',
        reason: 'other',
      })
    ).rejects.toThrow('NO_SUCH_USERNAME');
  });
});
