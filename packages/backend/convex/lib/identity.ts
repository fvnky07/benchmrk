import type { Auth } from 'convex/server';
import { ConvexError } from 'convex/values';

type AuthContext = { auth: Auth };

/** The signed-in Benchmrk identity's id, or null when signed out. */
export async function getIdentityId(ctx: AuthContext): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

/** The signed-in Benchmrk identity's id; throws NOT_AUTHENTICATED when signed out. */
export async function requireIdentityId(ctx: AuthContext): Promise<string> {
  const identityId = await getIdentityId(ctx);
  if (!identityId) throw new ConvexError('NOT_AUTHENTICATED');
  return identityId;
}
