import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  hasSession,
  markEmailVerified,
  nativePost,
  register,
  signIn,
  TEST_PASSWORD,
} from './authTestClient.testing';
import { createTest, type TestBackend } from './harness.testing';

const resend = vi.fn<typeof fetch>();
const NEW_PASSWORD = 'a-brand-new-password-3';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-for-password-recovery-01');
  vi.stubEnv('SITE_URL', 'http://localhost:3000');
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key');
  resend.mockReset();
  resend.mockImplementation(async () => new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', resend);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function resetMails() {
  return resend.mock.calls
    .filter(([url]) => String(url) === 'https://api.resend.com/emails')
    .map(
      ([, init]) =>
        JSON.parse(String(init?.body)) as { to: string[]; html: string }
    )
    .filter((mail) => mail.html.includes('reset-password'));
}

async function requestReset(t: TestBackend, email: string) {
  return t.fetch(
    '/api/auth/request-password-reset',
    nativePost({ email, redirectTo: 'native://reset-password' })
  );
}

/** Opens the emailed link and returns the token the app receives. */
async function tokenFromLink(t: TestBackend): Promise<string> {
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  const link = resetMails()
    .at(-1)
    ?.html.match(/href="([^"]+)"/)?.[1];
  if (!link) throw new Error('no reset link mailed');
  const url = new URL(link.replaceAll('&amp;', '&'));
  const response = await t.fetch(url.pathname + url.search, {
    redirect: 'manual',
  });
  const location = new URL(response.headers.get('location') ?? '');
  expect(`${location.protocol}//${location.host}${location.pathname}`).toBe(
    'native://reset-password'
  );
  return location.searchParams.get('token') ?? '';
}

async function resetPassword(t: TestBackend, token: string) {
  return t.fetch(
    '/api/auth/reset-password',
    nativePost({ token, newPassword: NEW_PASSWORD })
  );
}

describe('password recovery', () => {
  test('a verified member resets their password from the emailed link', async () => {
    const t = createTest();
    const { cookie } = await register(t, 'pat@example.com');
    await markEmailVerified(t, 'pat@example.com');

    expect((await requestReset(t, 'pat@example.com')).status).toBe(200);
    const response = await resetPassword(t, await tokenFromLink(t));

    expect(response.status).toBe(200);
    expect((await signIn(t, 'pat@example.com', NEW_PASSWORD)).status).toBe(200);
    expect((await signIn(t, 'pat@example.com', TEST_PASSWORD)).status).toBe(
      401
    );
    expect(await hasSession(t, cookie)).toBe(false);
  });

  test('every email gets the same answer, but only verified members get mail', async () => {
    const t = createTest();
    await register(t, 'unverified@example.com');
    await register(t, 'verified@example.com');
    await markEmailVerified(t, 'verified@example.com');

    const unknown = await requestReset(t, 'nobody@example.com');
    const unverified = await requestReset(t, 'unverified@example.com');
    const verified = await requestReset(t, 'verified@example.com');

    expect(unknown.status).toBe(200);
    expect(unverified.status).toBe(200);
    expect(verified.status).toBe(200);
    const acknowledgement = await unknown.json();
    expect(await unverified.json()).toEqual(acknowledgement);
    expect(await verified.json()).toEqual(acknowledgement);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(resetMails().map((mail) => mail.to[0])).toEqual([
      'verified@example.com',
    ]);
  });

  test.each(['provider 503', 'network failure', 'missing configuration'])(
    '%s cannot distinguish eligible reset requests from ineligible requests',
    async (failure) => {
      const t = createTest();
      await register(t, 'pat@example.com');
      await markEmailVerified(t, 'pat@example.com');
      await register(t, 'unverified@example.com');
      resend.mockClear();
      if (failure === 'provider 503') {
        resend.mockResolvedValue(new Response('{}', { status: 503 }));
      } else if (failure === 'network failure') {
        resend.mockRejectedValue(new TypeError('Network unavailable'));
      } else {
        vi.stubEnv('RESEND_API_KEY', '');
      }

      const responses = await Promise.all(
        ['pat@example.com', 'unverified@example.com', 'nobody@example.com'].map(
          (email) => requestReset(t, email)
        )
      );
      expect(responses.map((response) => response.status)).toEqual([
        200, 200, 200,
      ]);
      const bodies = await Promise.all(
        responses.map((response) => response.json())
      );
      expect(bodies[0]).toEqual(bodies[1]);
      expect(bodies[0]).toEqual(bodies[2]);
      expect(resend).not.toHaveBeenCalled();

      await t.finishAllScheduledFunctions(vi.runAllTimers);
      expect(resetMails().map((mail) => mail.to[0])).toEqual(
        failure === 'missing configuration'
          ? []
          : ['pat@example.com', 'pat@example.com']
      );
    }
  );

  test('a failed queued reset delivery retries once and sends a usable link', async () => {
    const t = createTest();
    await register(t, 'pat@example.com');
    await markEmailVerified(t, 'pat@example.com');
    resend.mockRejectedValueOnce(new TypeError('Network unavailable'));

    expect((await requestReset(t, 'pat@example.com')).status).toBe(200);
    expect((await resetPassword(t, await tokenFromLink(t))).status).toBe(200);
    expect(resetMails().map((mail) => mail.to[0])).toEqual([
      'pat@example.com',
      'pat@example.com',
    ]);
  });

  test('an invalid, reused or expired link changes nothing', async () => {
    const t = createTest();
    await register(t, 'pat@example.com');
    await markEmailVerified(t, 'pat@example.com');
    await requestReset(t, 'pat@example.com');
    const token = await tokenFromLink(t);

    expect((await resetPassword(t, 'not-a-real-token')).status).toBe(400);
    expect((await resetPassword(t, token)).status).toBe(200);
    expect((await resetPassword(t, token)).status).toBe(400);

    await requestReset(t, 'pat@example.com');
    const late = await tokenFromLink(t);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
    expect((await resetPassword(t, late)).status).toBe(400);
    vi.useRealTimers();
    expect((await signIn(t, 'pat@example.com', NEW_PASSWORD)).status).toBe(200);
  });
});
