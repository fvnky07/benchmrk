import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { api } from '../_generated/api';
import { createTest, type TestBackend } from './harness.testing';

const resend = vi.fn<typeof fetch>();
const MAINTAINER = 'privacy@benchmrk.test';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv('SITE_URL', 'https://benchmrk.app');
  vi.stubEnv('RESEND_API_KEY', 'test-resend-key');
  vi.stubEnv('DELETION_REQUEST_NOTIFY_EMAIL', MAINTAINER);
  resend.mockReset();
  resend.mockImplementation(async () => new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', resend);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function mails() {
  return resend.mock.calls
    .filter(([url]) => String(url) === 'https://api.resend.com/emails')
    .map(
      ([, init]) =>
        JSON.parse(String(init?.body)) as {
          to: string[];
          subject: string;
          html: string;
        }
    );
}

/** The token from the most recent confirmation link mailed to `email`. */
function confirmationToken(email: string): string {
  const mail = mails()
    .filter((sent) => sent.to[0] === email)
    .at(-1);
  const token = mail?.html.match(
    /delete-account\/confirm\?token=([a-f0-9]+)/
  )?.[1];
  if (!token) throw new Error(`no confirmation link mailed to ${email}`);
  return token;
}

async function request(t: TestBackend, email: string) {
  await t.action(api.deletionRequests.request, { email });
}

describe('deletion requests from the website', () => {
  test('nothing reaches the maintainer until the requester confirms the emailed link', async () => {
    const t = createTest();

    await request(t, 'Former@Example.com');
    expect(mails().map((mail) => mail.to[0])).toEqual(['former@example.com']);

    await t.action(api.deletionRequests.confirm, {
      token: confirmationToken('former@example.com'),
    });

    const toMaintainer = mails().filter((mail) => mail.to[0] === MAINTAINER);
    expect(toMaintainer).toHaveLength(1);
    expect(toMaintainer[0]?.html).toContain('former@example.com');
  });

  test('repeating the request or the confirmation never duplicates it', async () => {
    const t = createTest();

    await request(t, 'former@example.com');
    const token = confirmationToken('former@example.com');
    await t.action(api.deletionRequests.confirm, { token });
    await t.action(api.deletionRequests.confirm, { token });
    await request(t, 'former@example.com');

    expect(mails().filter((mail) => mail.to[0] === MAINTAINER)).toHaveLength(1);
    expect(
      mails().filter((mail) => mail.to[0] === 'former@example.com')
    ).toHaveLength(1);
  });

  test('an unknown or expired link is refused', async () => {
    const t = createTest();
    await request(t, 'former@example.com');
    const token = confirmationToken('former@example.com');

    await expect(
      t.action(api.deletionRequests.confirm, { token: 'f'.repeat(64) })
    ).rejects.toThrow('INVALID_DELETION_LINK');

    vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    await expect(
      t.action(api.deletionRequests.confirm, { token })
    ).rejects.toThrow('INVALID_DELETION_LINK');
  });
});
