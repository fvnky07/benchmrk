import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api } from '../_generated/api';
import {
  createAuthIdentity,
  createTest,
  type TestBackend,
} from './harness.testing';

const resend = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-for-magic-links-0123456789');
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

function mailedTo(): string[] {
  return resend.mock.calls
    .filter(([url]) => String(url) === 'https://api.resend.com/emails')
    .map(([, init]) => JSON.parse(String(init?.body)).to[0]);
}

async function joinWaitlist(t: TestBackend, email: string) {
  await t.run((ctx) =>
    ctx.db.insert('waitlist', { email, position: 1, createdAt: Date.now() })
  );
}

describe('native sign-in links', () => {
  test('every valid email gets the same answer and only a confirmed Waitlist identity is mailed', async () => {
    const t = createTest();
    await joinWaitlist(t, 'confirmed@example.com');
    await createAuthIdentity(t, {
      email: 'confirmed@example.com',
      emailVerified: true,
    });
    await joinWaitlist(t, 'unconfirmed@example.com');
    await createAuthIdentity(t, {
      email: 'registered-only@example.com',
      emailVerified: true,
    });

    for (const email of [
      'stranger@example.com',
      'unconfirmed@example.com',
      'registered-only@example.com',
      '  CONFIRMED@example.com ',
    ]) {
      expect(await t.action(api.waitlist.requestSignInLink, { email })).toEqual(
        { status: 'accepted' }
      );
    }
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(mailedTo()).toEqual(['confirmed@example.com']);
  });

  test('a second request within five minutes sends nothing more', async () => {
    const t = createTest();
    await joinWaitlist(t, 'confirmed@example.com');
    await createAuthIdentity(t, {
      email: 'confirmed@example.com',
      emailVerified: true,
    });

    await t.action(api.waitlist.requestSignInLink, {
      email: 'confirmed@example.com',
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.advanceTimersByTime(4 * 60 * 1000);
    await t.action(api.waitlist.requestSignInLink, {
      email: 'confirmed@example.com',
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(mailedTo()).toHaveLength(1);

    vi.advanceTimersByTime(2 * 60 * 1000);
    await t.action(api.waitlist.requestSignInLink, {
      email: 'confirmed@example.com',
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(mailedTo()).toHaveLength(2);
  });

  test.each(['provider 503', 'network failure', 'missing configuration'])(
    '%s surfaces a retryable error without consuming the sign-in cooldown',
    async (failure) => {
      const t = createTest();
      await joinWaitlist(t, 'confirmed@example.com');
      await createAuthIdentity(t, {
        email: 'confirmed@example.com',
        emailVerified: true,
      });
      if (failure === 'provider 503') {
        resend.mockResolvedValueOnce(new Response('{}', { status: 503 }));
      } else if (failure === 'network failure') {
        resend.mockRejectedValueOnce(new TypeError('Network unavailable'));
      } else {
        vi.stubEnv('RESEND_API_KEY', '');
      }

      await expect(
        t.action(api.waitlist.requestSignInLink, {
          email: 'confirmed@example.com',
        })
      ).rejects.toThrow('EMAIL_DELIVERY_FAILED');
      vi.stubEnv('RESEND_API_KEY', 'test-resend-key');
      await expect(
        t.action(api.waitlist.requestSignInLink, {
          email: 'confirmed@example.com',
        })
      ).resolves.toEqual({ status: 'accepted' });
      expect(mailedTo().at(-1)).toBe('confirmed@example.com');
    }
  );

  test('a malformed email is refused', async () => {
    const t = createTest();

    await expect(
      t.action(api.waitlist.requestSignInLink, { email: 'not-an-email' })
    ).rejects.toThrow('INVALID_EMAIL');
  });
});
