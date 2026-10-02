import { ConvexError } from 'convex/values';

import { components } from '../_generated/api';
import type { QueryCtx } from '../_generated/server';

/** The Better Auth identity behind a session subject, or null. */
export async function findAuthIdentity(ctx: QueryCtx, identityId: string) {
  return ctx.runQuery(components.betterAuth.users.getUser, {
    userId: identityId,
  });
}

/**
 * Groups and password recovery need a verified email; Workouts don't. Apple and
 * Google identities arrive with their provider-verified email marked verified.
 */
export async function requireVerifiedEmail(
  ctx: QueryCtx,
  identityId: string
): Promise<void> {
  const identity = await findAuthIdentity(ctx, identityId);
  if (identity?.emailVerified !== true) {
    throw new ConvexError('EMAIL_NOT_VERIFIED');
  }
}
