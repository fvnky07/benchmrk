import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, internal } from '../_generated/api';
import {
  createAuthIdentity,
  createTest,
  type TestBackend,
  type TestMember,
} from './harness.testing';
import { START, useWorkoutClock } from './workoutFixtures.testing';

beforeEach(useWorkoutClock);
afterEach(() => vi.useRealTimers());

async function member(t: TestBackend, username: string): Promise<TestMember> {
  const identityId = await createAuthIdentity(t, {
    email: `${username}@example.com`,
    emailVerified: true,
  });
  const signedIn = t.withIdentity({ subject: identityId });
  await signedIn.mutation(api.profile.updateProfile, { username });
  return signedIn;
}

async function hostWithCode(t: TestBackend) {
  const host = await member(t, 'host');
  await host.mutation(api.groups.create, {});
  const { code } = await host.mutation(api.groups.shareCode, {});
  return { host, code };
}

describe('Group presence and lifecycle', () => {
  test('a box reconnects at 30 seconds and becomes active after a heartbeat', async () => {
    const t = createTest();
    const { host, code } = await hostWithCode(t);
    const guest = await member(t, 'guest');
    await guest.mutation(api.groups.joinByCode, { code });

    vi.setSystemTime(START + 29_999);
    expect(
      (await host.query(api.groups.getMine, {}))?.members.find(
        (box) => box.username === 'guest'
      )?.presence
    ).toBe('active');

    vi.setSystemTime(START + 30_000);
    const reconnecting = (
      await host.query(api.groups.getMine, {})
    )?.members.find((box) => box.username === 'guest');
    expect(reconnecting).toMatchObject({
      lastSeenAt: START,
      presence: 'reconnecting',
    });

    await guest.mutation(api.groups.heartbeat, {});
    const active = (await host.query(api.groups.getMine, {}))?.members.find(
      (box) => box.username === 'guest'
    );
    expect(active).toMatchObject({
      lastSeenAt: START + 30_000,
      presence: 'active',
      progress: reconnecting?.progress,
    });
  });

  test('a member drops at 10 minutes and can rejoin a still-live Group', async () => {
    const t = createTest();
    const { host, code } = await hostWithCode(t);
    const guest = await member(t, 'guest');
    await guest.mutation(api.groups.joinByCode, { code });

    vi.setSystemTime(START + 599_999);
    await host.mutation(api.groups.heartbeat, {});
    await t.mutation(internal.groupSweeps.sweep, {});
    expect(
      (await host.query(api.groups.getMine, {}))?.members.map(
        (box) => box.username
      )
    ).toEqual(['host', 'guest']);

    vi.setSystemTime(START + 600_000);
    await t.mutation(internal.groupSweeps.sweep, {});
    expect(
      (await host.query(api.groups.getMine, {}))?.members.map(
        (box) => box.username
      )
    ).toEqual(['host']);
    expect(await guest.query(api.groups.getMine, {})).toBeNull();
    expect(await host.query(api.groups.events, {})).toContainEqual({
      eventId: expect.any(String),
      isYou: false,
      exerciseName: null,
      setNumber: null,
      reacted: false,
      kind: 'dropped',
      username: 'guest',
      at: START + 600_000,
    });
    await guest.mutation(api.groups.heartbeat, {});
    expect(await guest.query(api.groups.getMine, {})).toBeNull();

    vi.setSystemTime(START + 601_000);
    await guest.mutation(api.groups.joinByCode, { code });
    expect(
      (await host.query(api.groups.getMine, {}))?.members.find(
        (box) => box.username === 'guest'
      )
    ).toMatchObject({
      joinedAt: START + 601_000,
      lastSeenAt: START + 601_000,
      presence: 'active',
    });
    expect(await guest.query(api.groups.events, {})).toEqual([
      {
        eventId: expect.any(String),
        kind: 'joined',
        username: 'guest',
        isYou: true,
        exerciseName: null,
        setNumber: null,
        reacted: false,
        at: START + 601_000,
      },
    ]);
  });

  test('a dropped host hands hosting to the longest-present member', async () => {
    const t = createTest();
    const { host, code } = await hostWithCode(t);
    const pat = await member(t, 'pat');
    const sam = await member(t, 'sam');
    vi.setSystemTime(START + 1_000);
    await pat.mutation(api.groups.joinByCode, { code });
    vi.setSystemTime(START + 2_000);
    await sam.mutation(api.groups.joinByCode, { code });

    vi.setSystemTime(START + 600_000);
    await pat.mutation(api.groups.heartbeat, {});
    await sam.mutation(api.groups.heartbeat, {});
    await t.mutation(internal.groupSweeps.sweep, {});

    expect(await host.query(api.groups.getMine, {})).toBeNull();
    const view = await pat.query(api.groups.getMine, {});
    expect(view?.isHost).toBe(true);
    expect(view?.members.map((box) => [box.username, box.isHost])).toEqual([
      ['pat', true],
      ['sam', false],
    ]);
    const events = await pat.query(api.groups.events, {});
    expect(events).toContainEqual({
      eventId: expect.any(String),
      isYou: false,
      exerciseName: null,
      setNumber: null,
      reacted: false,
      kind: 'dropped',
      username: 'host',
      at: START + 600_000,
    });
    expect(events).toContainEqual({
      eventId: expect.any(String),
      isYou: true,
      exerciseName: null,
      setNumber: null,
      reacted: false,
      kind: 'hostChanged',
      username: 'pat',
      at: START + 600_000,
    });
    await expect(sam.mutation(api.groups.end, {})).rejects.toThrow('NOT_HOST');
    await pat.mutation(api.groups.end, {});
    expect(await sam.query(api.groups.getMine, {})).toBeNull();
  });

  test('a leaving host hands hosting to the longest-present member', async () => {
    const t = createTest();
    const { host, code } = await hostWithCode(t);
    const pat = await member(t, 'pat');
    const sam = await member(t, 'sam');
    vi.setSystemTime(START + 1_000);
    await pat.mutation(api.groups.joinByCode, { code });
    vi.setSystemTime(START + 2_000);
    await sam.mutation(api.groups.joinByCode, { code });
    vi.setSystemTime(START + 3_000);
    await host.mutation(api.groups.leave, {});

    expect(await host.query(api.groups.getMine, {})).toBeNull();
    expect((await pat.query(api.groups.getMine, {}))?.isHost).toBe(true);
    expect((await sam.query(api.groups.getMine, {}))?.isHost).toBe(false);
    const events = await pat.query(api.groups.events, {});
    expect(events).toContainEqual({
      eventId: expect.any(String),
      isYou: false,
      exerciseName: null,
      setNumber: null,
      reacted: false,
      kind: 'left',
      username: 'host',
      at: START + 3_000,
    });
    expect(events).toContainEqual({
      eventId: expect.any(String),
      isYou: true,
      exerciseName: null,
      setNumber: null,
      reacted: false,
      kind: 'hostChanged',
      username: 'pat',
      at: START + 3_000,
    });
    await pat.mutation(api.groups.revokeCode, {});
    await expect(
      (await member(t, 'late')).mutation(api.groups.joinByCode, { code })
    ).rejects.toThrow('CODE_INVALID');
  });

  test('four hours of idle time ends a Group even while heartbeats continue', async () => {
    const t = createTest();
    const { host, code } = await hostWithCode(t);
    const late = await member(t, 'late');

    vi.setSystemTime(START + 4 * 3_600_000 - 1);
    await host.mutation(api.groups.heartbeat, {});
    await t.mutation(internal.groupSweeps.sweep, {});
    expect((await host.query(api.groups.getMine, {}))?.isHost).toBe(true);

    vi.setSystemTime(START + 4 * 3_600_000);
    await t.mutation(internal.groupSweeps.sweep, {});
    expect(await host.query(api.groups.getMine, {})).toBeNull();
    expect(await host.query(api.groups.events, {})).toEqual([]);
    await expect(
      late.mutation(api.groups.joinByCode, { code })
    ).rejects.toThrow('CODE_INVALID');
  });

  test('events start at the viewer’s arrival and are newest first', async () => {
    const t = createTest();
    const { host, code } = await hostWithCode(t);
    const early = await member(t, 'early');
    const late = await member(t, 'late');
    vi.setSystemTime(START + 1_000);
    await early.mutation(api.groups.joinByCode, { code });
    vi.setSystemTime(START + 2_000);
    await late.mutation(api.groups.joinByCode, { code });
    vi.setSystemTime(START + 3_000);
    await early.mutation(api.groups.leave, {});

    expect(await late.query(api.groups.events, {})).toEqual([
      {
        eventId: expect.any(String),
        kind: 'left',
        username: 'early',
        isYou: false,
        exerciseName: null,
        setNumber: null,
        reacted: false,
        at: START + 3_000,
      },
      {
        eventId: expect.any(String),
        kind: 'joined',
        username: 'late',
        isYou: true,
        exerciseName: null,
        setNumber: null,
        reacted: false,
        at: START + 2_000,
      },
    ]);
    expect(await host.query(api.groups.events, {})).toEqual([
      {
        eventId: expect.any(String),
        kind: 'left',
        username: 'early',
        isYou: false,
        exerciseName: null,
        setNumber: null,
        reacted: false,
        at: START + 3_000,
      },
      {
        eventId: expect.any(String),
        kind: 'joined',
        username: 'late',
        isYou: false,
        exerciseName: null,
        setNumber: null,
        reacted: false,
        at: START + 2_000,
      },
      {
        eventId: expect.any(String),
        kind: 'joined',
        username: 'early',
        isYou: false,
        exerciseName: null,
        setNumber: null,
        reacted: false,
        at: START + 1_000,
      },
      {
        eventId: expect.any(String),
        kind: 'joined',
        username: 'host',
        isYou: true,
        exerciseName: null,
        setNumber: null,
        reacted: false,
        at: START,
      },
    ]);
    expect(await early.query(api.groups.events, {})).toEqual([]);
    expect(await t.query(api.groups.events, {})).toEqual([]);
  });

  test('dropping the last member ends the Group and invalidates its code', async () => {
    const t = createTest();
    const { host, code } = await hostWithCode(t);
    const late = await member(t, 'late');
    vi.setSystemTime(START + 600_000);
    await t.mutation(internal.groupSweeps.sweep, {});

    expect(await host.query(api.groups.getMine, {})).toBeNull();
    await expect(
      late.mutation(api.groups.joinByCode, { code })
    ).rejects.toThrow('CODE_INVALID');
  });
});
