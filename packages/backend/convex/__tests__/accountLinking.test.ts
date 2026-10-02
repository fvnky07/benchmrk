import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, components } from '../_generated/api';
import {
  nativePost,
  register,
  signIn,
  TEST_PASSWORD,
} from './authTestClient.testing';
import { createTest, type TestBackend } from './harness.testing';

beforeEach(() => {
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-for-account-linking-0123');
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

async function linkGoogle(t: TestBackend, identityId: string) {
  const now = Date.now();
  await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: 'account',
      data: {
        accountId: 'google-123',
        providerId: 'google',
        userId: identityId,
        createdAt: now,
        updatedAt: now,
      },
    },
  });
}

describe('provider unlinking', () => {
  test('a linked provider unlinks while another sign-in method remains', async () => {
    const t = createTest();
    const { cookie, identityId } = await register(t, 'pat@example.com');
    await linkGoogle(t, identityId);

    const unlinkGoogle = await t.fetch(
      '/api/auth/unlink-account',
      nativePost({ providerId: 'google' }, cookie)
    );

    expect(unlinkGoogle.status).toBe(200);
  });

  test('the last remaining sign-in method can never be unlinked', async () => {
    const t = createTest();
    const { cookie, identityId } = await register(t, 'pat@example.com');
    await linkGoogle(t, identityId);
    await t.mutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: 'account',
        where: [{ field: 'providerId', value: 'credential' }],
      },
    });

    const unlinkLast = await t.fetch(
      '/api/auth/unlink-account',
      nativePost({ providerId: 'google' }, cookie)
    );

    expect(unlinkLast.status).toBe(400);
    expect(await unlinkLast.text()).toContain('FAILED_TO_UNLINK_LAST_ACCOUNT');
  });

  test('the password is never removed, even while a provider is linked', async () => {
    const t = createTest();
    const { cookie, identityId } = await register(t, 'pat@example.com');
    await linkGoogle(t, identityId);

    const unlinkPassword = await t.fetch(
      '/api/auth/unlink-account',
      nativePost({ providerId: 'credential' }, cookie)
    );

    expect(unlinkPassword.status).toBe(400);
    expect(await unlinkPassword.text()).toContain('PASSWORD_CANNOT_BE_REMOVED');
    expect((await signIn(t, 'pat@example.com', TEST_PASSWORD)).status).toBe(
      200
    );
  });

  test('unlinking never changes profile details', async () => {
    const t = createTest();
    const { cookie, identityId } = await register(t, 'pat@example.com');
    await linkGoogle(t, identityId);

    await t.fetch(
      '/api/auth/unlink-account',
      nativePost({ providerId: 'google' }, cookie)
    );

    expect(
      await t
        .withIdentity({ subject: identityId })
        .query(api.auth.getEmailVerification, {})
    ).toMatchObject({ email: 'pat@example.com' });
  });
});
