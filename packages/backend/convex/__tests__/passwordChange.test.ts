import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  hasSession,
  nativePost,
  register,
  sessionCookie,
  signIn,
  TEST_PASSWORD,
} from './authTestClient.testing';
import { createTest } from './harness.testing';

beforeEach(() => {
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-for-password-change-0123');
  vi.stubEnv('SITE_URL', 'http://localhost:3000');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status: 200 }))
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('password change', () => {
  test('signs out every other device and keeps this one signed in', async () => {
    const t = createTest();
    const { cookie: thisDevice } = await register(t, 'pat@example.com');
    const otherDevice = sessionCookie(
      await signIn(t, 'pat@example.com', TEST_PASSWORD)
    );

    const response = await t.fetch(
      '/api/auth/change-password',
      nativePost(
        { currentPassword: TEST_PASSWORD, newPassword: 'a-new-password-22' },
        thisDevice
      )
    );

    expect(response.status).toBe(200);
    expect(await hasSession(t, otherDevice)).toBe(false);
    expect(await hasSession(t, sessionCookie(response))).toBe(true);
    expect(
      (await signIn(t, 'pat@example.com', 'a-new-password-22')).status
    ).toBe(200);
    expect((await signIn(t, 'pat@example.com', TEST_PASSWORD)).status).toBe(
      401
    );
  });

  test('a wrong current password changes nothing', async () => {
    const t = createTest();
    const { cookie } = await register(t, 'pat@example.com');

    const response = await t.fetch(
      '/api/auth/change-password',
      nativePost(
        {
          currentPassword: 'not-my-password',
          newPassword: 'a-new-password-22',
        },
        cookie
      )
    );

    expect(response.status).toBe(400);
    expect((await signIn(t, 'pat@example.com', TEST_PASSWORD)).status).toBe(
      200
    );
  });
});
