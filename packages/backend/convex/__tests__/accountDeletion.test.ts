import { generateKeyPairSync } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, components, internal } from '../_generated/api';
import {
  hasSession,
  nativePost,
  register,
  signIn,
  TEST_PASSWORD,
} from './authTestClient.testing';
import { createTest, type TestBackend } from './harness.testing';
import { exerciseId } from './workoutFixtures.testing';

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
  await member.mutation(api.routines.addExercise, {
    routineId,
    exerciseId: await exerciseId(t, 'bench-press'),
  });
  await member.mutation(api.workouts.start, { routineId });
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
  return { cookie, identityId };
}

/** Every app row that belongs to an identity. */
async function rowsOwnedBy(t: TestBackend, userId: string) {
  return t.run(async (ctx) => {
    const byUser = await Promise.all(
      (
        [
          'memberSettings',
          'routines',
          'workouts',
          'sets',
          'exerciseComments',
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
    return [...byUser.flat(), ...custom].length;
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
  return t.fetch('/api/auth/delete-user', {
    ...request,
    headers: { ...(request.headers as Record<string, string>), ...headers },
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
    expect(await rowsOwnedBy(t, pat.identityId)).toBe(0);
    expect(await identityExists(t, 'pat@example.com')).toBe(false);
    expect(await hasSession(t, pat.cookie)).toBe(false);
    expect((await signIn(t, 'pat@example.com', TEST_PASSWORD)).status).toBe(
      401
    );
    expect(await rowsOwnedBy(t, sam.identityId)).toBe(samRows);
    expect(await identityExists(t, 'sam@example.com')).toBe(true);
  });

  test('revokes authentication before removing owned rows in scheduled batches', async () => {
    const t = createTest();
    await t.mutation(internal.init.seed, {});
    const member = await register(t, 'many@example.com');
    const pressId = await exerciseId(t, 'bench-press');
    await t.run(async (ctx) => {
      for (let index = 0; index < 150; index++) {
        await ctx.db.insert('exerciseComments', {
          exerciseId: pressId,
          userId: member.identityId,
          body: `Private note ${index}`,
          createdAt: index,
        });
      }
    });

    const response = await deleteAccount(t, member.cookie, {
      password: TEST_PASSWORD,
    });

    expect(response.status).toBe(200);
    expect(await identityExists(t, 'many@example.com')).toBe(false);
    expect(await hasSession(t, member.cookie)).toBe(false);
    expect(await rowsOwnedBy(t, member.identityId)).toBeGreaterThan(0);

    await finishDeletion(t);

    expect(await rowsOwnedBy(t, member.identityId)).toBe(0);
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

    expect(await rowsOwnedBy(t, pat.identityId)).toBe(before);
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
    expect(await rowsOwnedBy(t, pat.identityId)).toBe(before);
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
