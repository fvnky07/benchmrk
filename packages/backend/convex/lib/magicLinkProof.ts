/**
 * Better Auth's magic-link endpoint is public, so anyone could ask it to mail a
 * link (and create an identity on verification). Only links requested by our
 * own server functions carry a proof: an HMAC of the email and the flow, keyed
 * with the auth secret. Mail without a valid proof is never sent.
 */
export type MagicLinkFlow = 'waitlist-confirmation' | 'native-sign-in';

// The Convex runtime provides Web Crypto and TextEncoder. They are declared
// here because React Native's type libraries, which also check this module
// through the generated API, don't include them.
declare const crypto: {
  subtle: {
    importKey(
      format: 'raw',
      keyData: Uint8Array,
      algorithm: { name: 'HMAC'; hash: 'SHA-256' },
      extractable: false,
      usages: ['sign']
    ): Promise<unknown>;
    sign(
      algorithm: 'HMAC',
      key: unknown,
      data: Uint8Array
    ): Promise<ArrayBuffer>;
  };
};
declare const TextEncoder: new () => { encode(input: string): Uint8Array };

const FLOWS: readonly MagicLinkFlow[] = [
  'waitlist-confirmation',
  'native-sign-in',
];

async function hmacHex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

export async function magicLinkProof(
  email: string,
  flow: MagicLinkFlow
): Promise<string> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET is required');
  return hmacHex(secret, `magic-link:${flow}:${email}`);
}

/** The flow a magic-link request was issued for, or null when it isn't ours. */
export async function authorizedMagicLinkFlow(
  email: string,
  metadata: Record<string, unknown> | undefined
): Promise<MagicLinkFlow | null> {
  const flow = FLOWS.find((candidate) => candidate === metadata?.flow);
  if (!flow || typeof metadata?.proof !== 'string') return null;
  const expected = await magicLinkProof(email, flow);
  if (expected.length !== metadata.proof.length) return null;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ metadata.proof.charCodeAt(index);
  }
  return difference === 0 ? flow : null;
}
