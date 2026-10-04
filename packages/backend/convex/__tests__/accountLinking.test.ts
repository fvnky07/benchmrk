import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api, components } from '../_generated/api';
import { nativePost, register } from './authTestClient.testing';
import { createTest, type TestBackend } from './harness.testing';

beforeEach(() => {
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-for-account-linking-0123');
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
  test('a sign-in method can be unlinked while another remains, never the last one', async () => {
    const t = createTest();
    const { cookie, identityId } = await register(t, 'pat@example.com');
    await linkGoogle(t, identityId);

    const unlinkPassword = await t.fetch(
      '/api/auth/unlink-account',
      nativePost({ providerId: 'credential' }, cookie)
    );
    expect(unlinkPassword.status).toBe(200);

    const unlinkLast = await t.fetch(
      '/api/auth/unlink-account',
      nativePost({ providerId: 'google' }, cookie)
    );
    expect(unlinkLast.status).toBe(400);
    expect(await unlinkLast.text()).toContain('FAILED_TO_UNLINK_LAST_ACCOUNT');
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
