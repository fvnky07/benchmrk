import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api } from '../_generated/api';
import { createAuthIdentity, createTest } from './harness.testing';

const resend = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-for-email-verification-01');
  vi.stubEnv('SITE_URL', 'http://localhost:3000');
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key');
  resend.mockReset();
  resend.mockImplementation(async () => new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', resend);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function verificationMails() {
  return resend.mock.calls
    .filter(([url]) => String(url) === 'https://api.resend.com/emails')
    .map(([, init]) => JSON.parse(String(init?.body)))
    .filter((mail) => String(mail.subject).includes('Verify'));
}

const nativeRequest = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'native://' },
  body: JSON.stringify(body),
});

describe('email verification', () => {
  test('registering sends exactly one verification email that opens the app', async () => {
    const t = createTest();

    const response = await t.fetch(
      '/api/auth/sign-up/email',
      nativeRequest({
        email: 'new-member@example.com',
        password: 'a-long-password-1',
        name: 'New Member',
      })
    );
    expect(response.status).toBe(200);

    const mails = verificationMails();
    expect(mails.map((mail) => mail.to[0])).toEqual(['new-member@example.com']);
    expect(mails[0]?.html).toContain(
      encodeURIComponent('native://email-verified')
    );
  });

  test('a member can ask for the verification email again', async () => {
    const t = createTest();
    await createAuthIdentity(t, {
      email: 'member@example.com',
      emailVerified: false,
    });

    await t.fetch(
      '/api/auth/send-verification-email',
      nativeRequest({ email: 'member@example.com' })
    );

    expect(verificationMails().map((mail) => mail.to[0])).toEqual([
      'member@example.com',
    ]);
  });

  test('the app sees whether the signed-in member’s email is verified', async () => {
    const t = createTest();
    const verified = await createAuthIdentity(t, {
      email: 'verified@example.com',
      emailVerified: true,
    });
    const unverified = await createAuthIdentity(t, {
      email: 'unverified@example.com',
      emailVerified: false,
    });

    expect(
      await t
        .withIdentity({ subject: verified })
        .query(api.auth.getEmailVerification, {})
    ).toEqual({ email: 'verified@example.com', emailVerified: true });
    expect(
      await t
        .withIdentity({ subject: unverified })
        .query(api.auth.getEmailVerification, {})
    ).toEqual({ email: 'unverified@example.com', emailVerified: false });
    expect(await t.query(api.auth.getEmailVerification, {})).toBeNull();
  });
});
