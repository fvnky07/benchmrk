import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { components } from '../_generated/api';
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
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key');
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

  test.each([
    ['too short', 'short-1'],
    ['too long', 'x'.repeat(129)],
  ])(
    'a new password that is %s is refused and changes nothing',
    async (_, newPassword) => {
      const t = createTest();
      const { cookie } = await register(t, 'pat@example.com');

      const response = await t.fetch(
        '/api/auth/change-password',
        nativePost({ currentPassword: TEST_PASSWORD, newPassword }, cookie)
      );

      expect(response.status).toBe(400);
      expect(await response.text()).toContain('PASSWORD_');
      expect((await signIn(t, 'pat@example.com', TEST_PASSWORD)).status).toBe(
        200
      );
    }
  );

  test('a request without a session is refused and changes nothing', async () => {
    const t = createTest();
    await register(t, 'pat@example.com');

    const response = await t.fetch(
      '/api/auth/change-password',
      nativePost({
        currentPassword: TEST_PASSWORD,
        newPassword: 'a-new-password-22',
      })
    );

    expect(response.status).toBe(401);
    expect((await signIn(t, 'pat@example.com', TEST_PASSWORD)).status).toBe(
      200
    );
  });

  test('a backend failure leaves the old password and sessions intact', async () => {
    const t = createTest();
    const { cookie } = await register(t, 'pat@example.com');
    await t.mutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: 'account',
        where: [{ field: 'providerId', value: 'credential' }],
      },
    });

    const response = await t.fetch(
      '/api/auth/change-password',
      nativePost(
        { currentPassword: TEST_PASSWORD, newPassword: 'a-new-password-22' },
        cookie
      )
    );

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await hasSession(t, cookie)).toBe(true);
  });
});
