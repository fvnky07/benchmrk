import { generateKeyPairSync } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, components, internal } from '../_generated/api';
import {
  hasSession,
  markEmailVerified,
  nativePost,
  register,
  signIn,
  TEST_PASSWORD,
} from './authTestClient.testing';
import { createTest, type TestBackend } from './harness.testing';
import { finishDue, pushService } from './pushService.testing';
import {
  activeWorkout,
  exerciseId,
  START,
  useWorkoutClock,
} from './workoutFixtures.testing';

const APPLE_CODE_HEADER = 'x-apple-authorization-code';
const outbound = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-for-account-deletion-001');
  vi.stubEnv('SITE_URL', 'http://localhost:3000');
  vi.stubEnv('APPLE_TEAM_ID', 'TEAM123456');
  vi.stubEnv('APPLE_KEY_ID', 'KEY1234567');
  vi.stubEnv('APPLE_APP_BUNDLE_IDENTIFIER', 'com.benchmrk.app');
  vi.stubEnv(
    'APPLE_PRIVATE_KEY',
    generateKeyPairSync('ec', { namedCurve: 'P-256' })
      .privateKey.export({ format: 'pem', type: 'pkcs8' })
      .toString()
  );
  outbound.mockReset();
  outbound.mockImplementation(async () => new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', outbound);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** A registered member with settings, a Routine, a Workout, a custom Exercise and a comment. */
async function memberWithData(t: TestBackend, email: string) {
  const { cookie, identityId } = await register(t, email);
  const member = t.withIdentity({ subject: identityId });
  await member.mutation(api.memberSettings.update, { units: 'lb' });
  const routineId = await member.mutation(api.routines.create, {
    name: 'Push',
  });
  const benchId = await member.mutation(api.routines.addExercise, {
    routineId,
    exerciseId: await exerciseId(t, 'bench-press'),
  });
  const legId = await member.mutation(api.routines.addExercise, {
    routineId,
    exerciseId: await exerciseId(t, 'leg-press'),
  });
  await member.mutation(api.routines.linkExercises, {
    routineExerciseId: benchId,
    withRoutineExerciseId: legId,
  });
  const workoutId = await member.mutation(api.workouts.start, { routineId });
  const workout = await member.query(api.workouts.getActive, {});
  const firstSet = workout?.exercises[0]?.sets[0];
  if (!firstSet) throw new Error('no Set');
  await member.mutation(api.workouts.completeSet, {
    setId: firstSet._id,
    weightKg: 60,
    reps: 8,
  });
  const custom = await member.mutation(api.exercises.createCustom, {
    name: 'Landmine Press',
    type: 'strength',
    equipment: 'barbell',
  });
  await member.mutation(api.exerciseComments.addComment, {
    exerciseId: custom.exerciseId,
    body: 'Brace first',
  });
  await member.mutation(api.exerciseComments.addComment, {
    exerciseId: await exerciseId(t, 'bench-press'),
    body: 'Feet planted',
  });
  await t.run(async (ctx) => {
    const groupId = await ctx.db.insert('groups', {
      hostId: identityId,
      status: 'ended',
      createdAt: 1,
      endedAt: 2,
      lastActivityAt: 2,
    });
    const eventId = await ctx.db.insert('groupEvents', {
      groupId,
      kind: 'ended',
      at: 2,
    });
    await ctx.db.insert('groupNotifications', {
      eventId,
      userId: identityId,
      kind: 'ended',
      copy: 'Your Group ended',
      createdAt: 2,
    });
  });
  await member.mutation(api.notes.save, {
    target: { kind: 'set', setId: firstSet._id },
    text: 'Keep the wrists straight',
  });
  await member.mutation(api.notes.save, {
    target: { kind: 'workout', workoutId },
    text: 'Morning Workout',
  });
  await member.mutation(api.notes.save, {
    target: { kind: 'exercise', exerciseId: custom.exerciseId },
    text: 'Brace first',
  });
  await member.mutation(api.machineSetups.save, {
    exerciseId: await exerciseId(t, 'leg-press'),
    positions: { seat: 3 },
    custom: [],
  });
  await t.run(async (ctx) => {
    await ctx.db.insert('waitlist', { email, createdAt: Date.now() });
    await ctx.db.insert('magicLinkRequests', {
      email,
      lastSentAt: Date.now(),
    });
  });
  return { cookie, identityId, routineId, workoutId };
}

/** Every app row that belongs to an identity. */
async function rowsOwnedBy(t: TestBackend, userId: string) {
  return t.run(async (ctx) => {
    const byUser = await Promise.all(
      (
        [
          'memberSettings',
          'groupNotifications',
          'routines',
          'workouts',
          'sets',
          'exerciseComments',
          'notes',
          'machineSetups',
          'groupMemberships',
          'groupRecapRows',
          'groupEvents',
          'deviceTokens',
        ] as const
      ).map(async (table) =>
        (await ctx.db.query(table).collect()).filter(
          (row) => row.userId === userId
        )
      )
    );
    const custom = (await ctx.db.query('exercises').collect()).filter(
      (exercise) => exercise.createdBy === userId
    );
    const routineIds = new Set(
      (await ctx.db.query('routines').collect())
        .filter((row) => row.userId === userId)
        .map((row) => row._id)
    );
    const workoutIds = new Set(
      (await ctx.db.query('workouts').collect())
        .filter((row) => row.userId === userId)
        .map((row) => row._id)
    );
    const children = await Promise.all([
      ...(['routineExercises', 'routineBlocks'] as const).map(async (table) =>
        (await ctx.db.query(table).collect()).filter((row) =>
          routineIds.has(row.routineId)
        )
      ),
      ...(['workoutExercises', 'workoutBlocks'] as const).map(async (table) =>
        (await ctx.db.query(table).collect()).filter((row) =>
          workoutIds.has(row.workoutId)
        )
      ),
    ]);
    const invites = (await ctx.db.query('groupInvites').collect()).filter(
      (row) => row.inviterId === userId || row.inviteeId === userId
    );
    const blocks = (await ctx.db.query('blocks').collect()).filter(
      (row) => row.blockerId === userId || row.blockedId === userId
    );
    const reports = (await ctx.db.query('reports').collect()).filter(
      (row) => row.reporterId === userId
    );
    const reactions = (await ctx.db.query('groupReactions').collect()).filter(
      (row) => row.fromUserId === userId || row.toUserId === userId
    );
    return [
      ...byUser.flat(),
      ...children.flat(),
      ...custom,
      ...invites,
      ...blocks,
      ...reports,
      ...reactions,
    ];
  });
}

async function identityExists(t: TestBackend, email: string) {
  const user = await t.query(components.betterAuth.adapter.findOne, {
    model: 'user',
    where: [{ field: 'email', value: email }],
  });
  return user !== null;
}

async function deleteAccount(
  t: TestBackend,
  cookie: string,
  body: { password?: string },
  headers: Record<string, string> = {}
) {
  const request = nativePost(body, cookie);
  const sessionResponse = await t.fetch('/api/auth/get-session', {
    headers: { origin: 'native://', cookie },
  });
  const session = (await sessionResponse.json()) as {
    user?: { id: string };
  } | null;
  return t.fetch('/api/auth/delete-user', {
    ...request,
    headers: {
      ...(request.headers as Record<string, string>),
      'x-deletion-identity-id': session?.user?.id ?? '',
      ...headers,
    },
  });
}

async function finishDeletion(t: TestBackend) {
  vi.useFakeTimers();
  try {
    await t.finishAllScheduledFunctions(vi.runAllTimers);
  } finally {
    vi.useRealTimers();
  }
}

describe('account deletion', () => {
  test('reauthenticating another identity deletes neither identity', async () => {
    const t = createTest();
    const pat = await register(t, 'pat@example.com');
    const sam = await register(t, 'sam@example.com');
    outbound.mockClear();
    const response = await deleteAccount(
      t,
      sam.cookie,
      { password: TEST_PASSWORD },
      { 'x-deletion-identity-id': pat.identityId }
    );
    expect(response.status).toBe(400);
    expect(await identityExists(t, 'pat@example.com')).toBe(true);
    expect(await identityExists(t, 'sam@example.com')).toBe(true);
    expect(await hasSession(t, pat.cookie)).toBe(true);
    expect(await hasSession(t, sam.cookie)).toBe(true);
    expect(outbound).not.toHaveBeenCalled();
  });

  test('with the password, the identity and all its data are gone and other members keep theirs', async () => {
    const t = createTest();
    await t.mutation(internal.init.seed, {});
    const pat = await memberWithData(t, 'pat@example.com');
    const sam = await memberWithData(t, 'sam@example.com');
    const samRows = await rowsOwnedBy(t, sam.identityId);

    const response = await deleteAccount(t, pat.cookie, {
      password: TEST_PASSWORD,
    });

    expect(response.status).toBe(200);
    await finishDeletion(t);
    expect(await rowsOwnedBy(t, pat.identityId)).toEqual([]);
    expect(await identityExists(t, 'pat@example.com')).toBe(false);
    expect(await hasSession(t, pat.cookie)).toBe(false);
    expect((await signIn(t, 'pat@example.com', TEST_PASSWORD)).status).toBe(
      401
    );
    expect(await rowsOwnedBy(t, sam.identityId)).toEqual(samRows);
    expect(await identityExists(t, 'sam@example.com')).toBe(true);
  });

  test('revokes access immediately and deletes large owned tables in scheduled batches', async () => {
    const t = createTest();
    await t.mutation(internal.init.seed, {});
    const pat = await memberWithData(t, 'pat@example.com');
    const exercise = await exerciseId(t, 'bench-press');
    await t.run(async (ctx) => {
      for (let index = 0; index < 150; index += 1) {
        await ctx.db.insert('exerciseComments', {
          exerciseId: exercise,
          userId: pat.identityId,
          body: `Comment ${index}`,
          createdAt: index,
        });
      }
    });

    const response = await deleteAccount(t, pat.cookie, {
      password: TEST_PASSWORD,
    });

    expect(response.status).toBe(200);
    expect(await hasSession(t, pat.cookie)).toBe(false);
    expect(await identityExists(t, 'pat@example.com')).toBe(false);
    expect((await rowsOwnedBy(t, pat.identityId)).length).toBeGreaterThan(0);

    await finishDeletion(t);
    expect(await rowsOwnedBy(t, pat.identityId)).toEqual([]);
  });

  test("deletion cascades across Groups and hands hosting on without touching another member's recap or Workout", async () => {
    useWorkoutClock();
    const t = createTest();
    await t.mutation(internal.init.seed, {});
    const pat = await memberWithData(t, 'pat@example.com');
    const sam = await memberWithData(t, 'sam@example.com');
    const outsider = await register(t, 'outsider@example.com');
    const patMember = t.withIdentity({ subject: pat.identityId });
    const samMember = t.withIdentity({ subject: sam.identityId });
    const outsideMember = t.withIdentity({ subject: outsider.identityId });
    for (const [client, username] of [
      [patMember, 'pat'],
      [samMember, 'sam'],
      [outsideMember, 'outsider'],
    ] as const) {
      await markEmailVerified(t, `${username}@example.com`);
      await client.mutation(api.profile.updateProfile, { username });
      await client.mutation(api.deviceTokens.register, {
        token: `ExpoPushToken[${username}]`,
        platform: 'ios',
      });
    }
    await patMember.mutation(api.deviceTokens.register, {
      token: 'ExpoPushToken[pat-android]',
      platform: 'android',
    });
    const service = pushService();
    const recapGroupId = await patMember.mutation(api.groups.create, {});
    const recapCode = await patMember.mutation(api.groups.shareCode, {});
    vi.setSystemTime(START + 1000);
    await samMember.mutation(api.groups.joinByCode, recapCode);
    for (const client of [patMember, samMember]) {
      const set = (await activeWorkout(client)).exercises[0]?.sets[1];
      if (!set) throw new Error('Missing recap Set');
      await client.mutation(api.workouts.completeSet, {
        setId: set._id,
        weightKg: 65,
        reps: 8,
      });
    }
    vi.setSystemTime(START + 2000);
    await patMember.mutation(api.groups.end, {});
    const samRecap = (
      await samMember.query(api.recaps.get, {
        groupId: recapGroupId,
      })
    ).rows.find((row) => row.isYou);
    const samRecapRows = await t.run((ctx) =>
      ctx.db
        .query('groupRecapRows')
        .withIndex('by_user', (q) => q.eq('userId', sam.identityId))
        .collect()
    );

    vi.setSystemTime(START + 3000);
    const liveGroupId = await patMember.mutation(api.groups.create, {});
    const liveCode = await patMember.mutation(api.groups.shareCode, {});
    vi.setSystemTime(START + 4000);
    await samMember.mutation(api.groups.joinByCode, liveCode);
    await outsideMember.mutation(api.groups.create, {});
    await patMember.mutation(api.groupInvites.send, { username: 'outsider' });
    await outsideMember.mutation(api.groupInvites.send, { username: 'pat' });
    await patMember.mutation(api.safety.block, { username: 'outsider' });
    await outsideMember.mutation(api.safety.block, { username: 'pat' });
    await patMember.mutation(api.safety.report, {
      username: 'sam',
      reason: 'spam',
    });
    await samMember.mutation(api.safety.report, {
      username: 'pat',
      reason: 'other',
    });
    for (const [client, reactor] of [
      [patMember, samMember],
      [samMember, patMember],
    ] as const) {
      const set = (await activeWorkout(client)).exercises[0]?.sets[2];
      if (!set) throw new Error('Missing live Group Set');
      vi.setSystemTime(Date.now() + 1000);
      await client.mutation(api.workouts.completeSet, {
        setId: set._id,
        weightKg: 70,
        reps: 8,
      });
      const event = (await reactor.query(api.groups.events, {})).find(
        (row) => row.kind === 'setCompleted' && !row.isYou
      );
      if (!event) throw new Error('Missing reaction event');
      await reactor.mutation(api.reactions.fistBump, {
        eventId: event.eventId,
      });
    }
    const ownedBefore = await rowsOwnedBy(t, pat.identityId);
    const samRows = await rowsOwnedBy(t, sam.identityId);
    const samGroup = await samMember.query(api.groups.getMine, {});
    const samWorkout = await samMember.query(api.workouts.getActive, {});
    const samRoutine = await samMember.query(api.routines.get, {
      routineId: sam.routineId,
    });
    const samInvites = await samMember.query(api.groupInvites.inbox, {});
    service.messages.length = 0;

    const response = await deleteAccount(t, pat.cookie, {
      password: TEST_PASSWORD,
    });
    expect(response.status).toBe(200);
    expect(await hasSession(t, pat.cookie)).toBe(false);
    expect(await identityExists(t, 'pat@example.com')).toBe(false);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await rowsOwnedBy(t, pat.identityId)).toEqual([]);
    // Saved ids also catch orphaned children whose parent has already gone.
    const removedRows = await t.run(async (ctx) =>
      Promise.all(ownedBefore.map((row) => ctx.db.get(row._id)))
    );
    expect(removedRows.every((row) => row === null)).toBe(true);
    for (const table of ['waitlist', 'magicLinkRequests'] as const) {
      expect(
        await t.run((ctx) =>
          ctx.db
            .query(table)
            .withIndex('by_email', (q) => q.eq('email', 'pat@example.com'))
            .collect()
        )
      ).toEqual([]);
    }
    const view = await samMember.query(api.groups.getMine, {});
    expect(view?.isHost).toBe(true);
    expect(view?.members).toHaveLength(1);
    expect(view?.members[0]).toMatchObject({ isYou: true, isHost: true });
    expect(await t.run((ctx) => ctx.db.get(liveGroupId))).toMatchObject({
      hostId: sam.identityId,
      status: 'live',
    });
    expect(await samMember.query(api.workouts.getActive, {})).toEqual(
      samWorkout
    );
    expect(
      await samMember.query(api.routines.get, {
        routineId: sam.routineId,
      })
    ).toEqual(samRoutine);
    expect(await samMember.query(api.groupInvites.inbox, {})).toEqual(
      samInvites
    );
    expect(
      (
        await samMember.query(api.recaps.get, {
          groupId: recapGroupId,
        })
      ).rows
    ).toEqual([samRecap]);
    expect(await t.run((ctx) => ctx.db.get(recapGroupId))).toMatchObject({
      hostId: pat.identityId,
      status: 'ended',
    });
    expect(
      await t.run((ctx) =>
        ctx.db
          .query('groupRecapRows')
          .withIndex('by_user', (q) => q.eq('userId', sam.identityId))
          .collect()
      )
    ).toEqual(samRecapRows);
    // Reactions involving the deleted identity must go in both directions.
    const preserved = samRows.filter((row) => !('fromUserId' in row));
    const preservedRows = await t.run(async (ctx) =>
      Promise.all(preserved.map((row) => ctx.db.get(row._id)))
    );
    expect(preservedRows).toEqual(preserved);
    await finishDue(t, 60_000);
    const recipients = service.messages.map((message) => message.to);
    expect(recipients).not.toContain('ExpoPushToken[pat]');
    expect(recipients).not.toContain('ExpoPushToken[pat-android]');
  });
  test('a wrong password or a stale session deletes nothing', async () => {
    const t = createTest();
    await t.mutation(internal.init.seed, {});
    const pat = await memberWithData(t, 'pat@example.com');
    const before = await rowsOwnedBy(t, pat.identityId);

    const wrong = await deleteAccount(t, pat.cookie, {
      password: 'not-my-password',
    });
    expect(wrong.status).toBe(400);

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    const stale = await deleteAccount(t, pat.cookie, {});
    expect(stale.status).toBe(400);
    vi.useRealTimers();

    expect(await rowsOwnedBy(t, pat.identityId)).toEqual(before);
    expect(await identityExists(t, 'pat@example.com')).toBe(true);
    expect((await signIn(t, 'pat@example.com', TEST_PASSWORD)).status).toBe(
      200
    );
  });

  test('an Apple member must confirm with Apple, and nothing is deleted unless Apple revokes', async () => {
    const t = createTest();
    await t.mutation(internal.init.seed, {});
    const pat = await memberWithData(t, 'pat@example.com');
    await t.mutation(components.betterAuth.adapter.create, {
      input: {
        model: 'account',
        data: {
          accountId: 'apple-subject',
          providerId: 'apple',
          userId: pat.identityId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    });
    const before = await rowsOwnedBy(t, pat.identityId);

    const withoutApple = await deleteAccount(t, pat.cookie, {
      password: TEST_PASSWORD,
    });
    expect(withoutApple.status).toBe(400);

    outbound.mockImplementation(async (url) =>
      String(url).endsWith('/auth/token')
        ? new Response('{"error":"invalid_grant"}', { status: 400 })
        : new Response('{}', { status: 200 })
    );
    const refused = await deleteAccount(
      t,
      pat.cookie,
      { password: TEST_PASSWORD },
      { [APPLE_CODE_HEADER]: 'expired-code' }
    );
    expect(refused.status).toBe(400);
    expect(await rowsOwnedBy(t, pat.identityId)).toEqual(before);
    expect(await identityExists(t, 'pat@example.com')).toBe(true);

    outbound.mockImplementation(async (url) =>
      String(url).endsWith('/auth/token')
        ? Response.json({ refresh_token: 'apple-refresh-token' })
        : new Response('{}', { status: 200 })
    );
    const deleted = await deleteAccount(
      t,
      pat.cookie,
      { password: TEST_PASSWORD },
      { [APPLE_CODE_HEADER]: 'fresh-code' }
    );
    await finishDeletion(t);
    expect(deleted.status).toBe(200);
    const revoke = outbound.mock.calls.find(([url]) =>
      String(url).endsWith('/auth/revoke')
    );
    expect(String(revoke?.[1]?.body)).toContain('token=apple-refresh-token');
    expect(await identityExists(t, 'pat@example.com')).toBe(false);
  });
});
