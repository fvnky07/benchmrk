import { constantTimeEqual, hmacSha256Hex } from './webCrypto';

/**
 * Better Auth's magic-link endpoint is public, so anyone could ask it to mail a
 * link (and create an identity on verification). Only links requested by our
 * own server functions carry a proof: an HMAC of the email and the flow, keyed
 * with the auth secret. Mail without a valid proof is never sent.
 */
export type MagicLinkFlow = 'waitlist-confirmation' | 'native-sign-in';

const FLOWS: readonly MagicLinkFlow[] = [
  'waitlist-confirmation',
  'native-sign-in',
];

export async function magicLinkProof(
  email: string,
  flow: MagicLinkFlow
): Promise<string> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET is required');
  return hmacSha256Hex(secret, `magic-link:${flow}:${email}`);
}

/** The flow a magic-link request was issued for, or null when it isn't ours. */
export async function authorizedMagicLinkFlow(
  email: string,
  metadata: Record<string, unknown> | undefined
): Promise<MagicLinkFlow | null> {
  const flow = FLOWS.find((candidate) => candidate === metadata?.flow);
  if (!flow || typeof metadata?.proof !== 'string') return null;
  return constantTimeEqual(await magicLinkProof(email, flow), metadata.proof)
    ? flow
    : null;
}
