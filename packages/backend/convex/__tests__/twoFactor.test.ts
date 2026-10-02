import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  hasSession,
  nativePost,
  register,
  sessionCookie,
  signIn,
  TEST_PASSWORD,
} from './authTestClient.testing';
import { createTest, type TestBackend } from './harness.testing';
import { totpCode } from './totp.testing';

const EMAIL = 'pat@example.com';

beforeEach(() => {
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-for-two-factor-auth-0001');
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

/** Enrolls an authenticator: password, then a first valid code. */
async function enroll(t: TestBackend, cookie: string) {
  const enable = await t.fetch(
    '/api/auth/two-factor/enable',
    nativePost({ password: TEST_PASSWORD }, cookie)
  );
  expect(enable.status).toBe(200);
  const { totpURI, backupCodes } = (await enable.json()) as {
    totpURI: string;
    backupCodes: string[];
  };
  const verify = await t.fetch(
    '/api/auth/two-factor/verify-totp',
    nativePost({ code: totpCode(totpURI) }, cookie)
  );
  expect(verify.status).toBe(200);
  return { totpURI, backupCodes, cookie: sessionCookie(verify) || cookie };
}

/** Signs in with the password; returns the challenge cookie when 2FA is on. */
async function passwordStep(t: TestBackend) {
  const response = await signIn(t, EMAIL, TEST_PASSWORD);
  const body = (await response.json()) as { twoFactorRedirect?: boolean };
  return { challenge: sessionCookie(response), body };
}

async function twoFactorEnabled(t: TestBackend, cookie: string) {
  const response = await t.fetch('/api/auth/get-session', {
    headers: { origin: 'native://', cookie },
  });
  const body = (await response.json()) as {
    user?: { twoFactorEnabled?: boolean };
  } | null;
  return body?.user?.twoFactorEnabled ?? false;
}

describe('two-factor authentication', () => {
  test('enrolling needs the password and a first valid code, and gives backup codes once', async () => {
    const t = createTest();
    const { cookie } = await register(t, EMAIL);

    const wrongPassword = await t.fetch(
      '/api/auth/two-factor/enable',
      nativePost({ password: 'not-my-password' }, cookie)
    );
    expect(wrongPassword.status).toBe(400);

    const enrolled = await enroll(t, cookie);
    expect(enrolled.backupCodes).toHaveLength(10);
    expect(await twoFactorEnabled(t, enrolled.cookie)).toBe(true);
  });

  test('sign-in stops at a challenge until a valid code is given', async () => {
    const t = createTest();
    const { cookie } = await register(t, EMAIL);
    const { totpURI } = await enroll(t, cookie);

    const { challenge, body } = await passwordStep(t);
    expect(body.twoFactorRedirect).toBe(true);
    expect(await hasSession(t, challenge)).toBe(false);

    const wrong = await t.fetch(
      '/api/auth/two-factor/verify-totp',
      nativePost({ code: '000000' }, challenge)
    );
    expect(wrong.status).toBe(401);
    expect(await hasSession(t, sessionCookie(wrong) || challenge)).toBe(false);

    const right = await t.fetch(
      '/api/auth/two-factor/verify-totp',
      nativePost({ code: totpCode(totpURI) }, challenge)
    );
    expect(right.status).toBe(200);
    expect(await hasSession(t, sessionCookie(right))).toBe(true);
  });

  test('a backup code works once', async () => {
    const t = createTest();
    const { cookie } = await register(t, EMAIL);
    const { backupCodes } = await enroll(t, cookie);
    const [code] = backupCodes;

    const first = await passwordStep(t);
    const used = await t.fetch(
      '/api/auth/two-factor/verify-backup-code',
      nativePost({ code }, first.challenge)
    );
    expect(used.status).toBe(200);
    expect(await hasSession(t, sessionCookie(used))).toBe(true);

    const second = await passwordStep(t);
    const reused = await t.fetch(
      '/api/auth/two-factor/verify-backup-code',
      nativePost({ code }, second.challenge)
    );
    expect(reused.status).toBe(401);
  });

  test('disabling needs the password and then sign-in has no challenge', async () => {
    const t = createTest();
    const { cookie } = await register(t, EMAIL);
    const enrolled = await enroll(t, cookie);

    const wrong = await t.fetch(
      '/api/auth/two-factor/disable',
      nativePost({ password: 'not-my-password' }, enrolled.cookie)
    );
    expect(wrong.status).toBe(400);
    expect(await twoFactorEnabled(t, enrolled.cookie)).toBe(true);

    const disabled = await t.fetch(
      '/api/auth/two-factor/disable',
      nativePost({ password: TEST_PASSWORD }, enrolled.cookie)
    );
    expect(disabled.status).toBe(200);
    expect((await passwordStep(t)).body.twoFactorRedirect).toBeUndefined();
  });
});
