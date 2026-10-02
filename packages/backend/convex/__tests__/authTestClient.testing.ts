import type { TestBackend } from './harness.testing';

/** A JSON POST as the native app sends it, with an optional session cookie. */
export function nativePost(body: unknown, cookie?: string): RequestInit {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'native://',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  };
}

/** The cookie header a client would send back after this response. */
export function sessionCookie(response: Response): string {
  return (response.headers.get('set-cookie') ?? '')
    .split(/,(?=[^;]+=)/)
    .map((part) => part.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
}

export const TEST_PASSWORD = 'a-long-password-1';

/** Registers with email and password; returns the session cookie and identity id. */
export async function register(t: TestBackend, email: string) {
  const response = await t.fetch(
    '/api/auth/sign-up/email',
    nativePost({ email, password: TEST_PASSWORD, name: 'Pat Lifter' })
  );
  const body = (await response.json()) as { user: { id: string } };
  return { cookie: sessionCookie(response), identityId: body.user.id };
}

/** Signs in with email and password; returns the response for its cookie. */
export async function signIn(t: TestBackend, email: string, password: string) {
  return t.fetch('/api/auth/sign-in/email', nativePost({ email, password }));
}

/** Whether a cookie still belongs to a live session. */
export async function hasSession(t: TestBackend, cookie: string) {
  const response = await t.fetch('/api/auth/get-session', {
    headers: { origin: 'native://', cookie },
  });
  const body = (await response.json()) as { session?: unknown } | null;
  return Boolean(body?.session);
}
