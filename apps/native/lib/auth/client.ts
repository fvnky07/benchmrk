import { expoClient } from '@better-auth/expo/client';
import { convexClient } from '@convex-dev/better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// SecureStore has a 2048-byte limit per value. Large auth payloads (cookie blob,
// session data) exceed this limit. We work around it by splitting large values
// into ≤2048-byte chunks stored under numbered keys, with a metadata key holding
// the chunk count. Reads reassemble chunks synchronously — no async required.

const CHUNK_SIZE = 2000; // slightly under 2048 to account for encoding overhead

function chunkWrite(key: string, value: string): void {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  // Write each chunk
  for (let i = 0; i < chunks.length; i++) {
    SecureStore.setItem(`${key}_c${i}`, chunks[i]);
  }
  // Write chunk count as metadata
  SecureStore.setItem(`${key}_n`, String(chunks.length));
  // Clean up any old chunks beyond the new count (handles value shrinking)
  let orphan = chunks.length;
  while (SecureStore.getItem(`${key}_c${orphan}`) !== null) {
    SecureStore.deleteItemAsync(`${key}_c${orphan}`).catch(() => {});
    orphan++;
  }
}

function chunkRead(key: string): string | null {
  const countStr = SecureStore.getItem(`${key}_n`);
  if (countStr === null) return null;
  const count = parseInt(countStr, 10);
  if (isNaN(count) || count <= 0) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const chunk = SecureStore.getItem(`${key}_c${i}`);
    if (chunk === null) return null; // incomplete — treat as missing
    parts.push(chunk);
  }
  return parts.join('');
}

const chunkedSecureStore = {
  getItem: (key: string): string | null => chunkRead(key),
  setItem: (key: string, value: string): void => chunkWrite(key, value),
};

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_CONVEX_SITE_URL,
  plugins: [
    expoClient({
      scheme: Constants.expoConfig?.scheme as string,
      storagePrefix: Constants.expoConfig?.scheme as string,
      storage: chunkedSecureStore,
    }),
    convexClient(),
  ],
});
