'use client';

// NOTE: Convex + Better Auth provider for client-side authentication

import {
  type AuthClient as ConvexAuthClient,
  ConvexBetterAuthProvider,
} from '@convex-dev/better-auth/react';
import { ConvexReactClient } from 'convex/react';
import type { ReactNode } from 'react';

import { authClient } from '@/lib/auth-client';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// @convex-dev/better-auth's provider declaration omits the documented client
// plugin composition used by this application.
const convexAuthClient = authClient as unknown as ConvexAuthClient;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={convexAuthClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
