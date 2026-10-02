// The Convex runtime provides Web Crypto and TextEncoder. They are declared
// here because React Native's type libraries, which also check backend modules
// through the generated API, don't include them.
declare const crypto: {
  getRandomValues(array: Uint8Array): Uint8Array;
  subtle: {
    digest(algorithm: 'SHA-256', data: Uint8Array): Promise<ArrayBuffer>;
    importKey(
      format: 'raw' | 'pkcs8',
      keyData: Uint8Array,
      algorithm:
        | { name: 'HMAC'; hash: 'SHA-256' }
        | { name: 'ECDSA'; namedCurve: 'P-256' },
      extractable: false,
      usages: ['sign']
    ): Promise<unknown>;
    sign(
      algorithm: 'HMAC' | { name: 'ECDSA'; hash: 'SHA-256' },
      key: unknown,
      data: Uint8Array
    ): Promise<ArrayBuffer>;
  };
};
declare const TextEncoder: new () => { encode(input: string): Uint8Array };
declare function atob(data: string): string;
declare function btoa(data: string): string;

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

/**
 * An ES256 JWT signed with a PKCS #8 PEM key, as Apple's client secrets are.
 * Web Crypto's ECDSA signature is already the raw r‖s form JWS expects.
 */
export async function signEs256Jwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  privateKeyPem: string
): Promise<string> {
  const encoder = new TextEncoder();
  const der = Uint8Array.from(
    atob(privateKeyPem.replace(/-----[A-Z ]+-----|\s/g, '')),
    (char) => char.charCodeAt(0)
  );
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const signingInput = `${base64Url(encoder.encode(JSON.stringify({ ...header, alg: 'ES256' })))}.${base64Url(encoder.encode(JSON.stringify(payload)))}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(signingInput)
  );
  return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

export async function hmacSha256Hex(
  secret: string,
  message: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

export async function sha256Hex(text: string): Promise<string> {
  return toHex(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  );
}

/** An unguessable token for emailed links (256 random bits, hex). */
export function randomToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

/** Compares two strings without leaking where they differ through timing. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}
