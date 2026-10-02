import { signEs256Jwt } from './webCrypto';

const APPLE = 'https://appleid.apple.com';
const CLIENT_SECRET_LIFETIME_SECONDS = 5 * 60;

/**
 * Revokes the member's Sign in with Apple authorization, as Apple requires
 * when an account is deleted. Native sign-in only keeps the identity token, so
 * the app re-authenticates with Apple first and hands over that fresh
 * authorization code; it's exchanged for a refresh token, which is revoked.
 * Throws unless Apple confirms both steps.
 */
export async function revokeAppleAuthorization(
  authorizationCode: string
): Promise<void> {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;
  const clientId = process.env.APPLE_APP_BUNDLE_IDENTIFIER;
  if (!teamId || !keyId || !privateKey || !clientId) {
    throw new Error('Sign in with Apple revocation is not configured');
  }
  const now = Math.floor(Date.now() / 1000);
  const clientSecret = await signEs256Jwt(
    { kid: keyId },
    {
      iss: teamId,
      iat: now,
      exp: now + CLIENT_SECRET_LIFETIME_SECONDS,
      aud: APPLE,
      sub: clientId,
    },
    privateKey
  );

  const exchange = await fetch(`${APPLE}/auth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    }).toString(),
  });
  const tokens = (await exchange.json().catch(() => ({}))) as {
    refresh_token?: string;
  };
  if (!exchange.ok || !tokens.refresh_token) {
    throw new Error('Apple did not accept the authorization code');
  }

  const revoke = await fetch(`${APPLE}/auth/revoke`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      token: tokens.refresh_token,
      token_type_hint: 'refresh_token',
    }).toString(),
  });
  if (!revoke.ok) throw new Error('Apple did not revoke the authorization');
}
