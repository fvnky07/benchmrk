// NOTE: Re-exports from convex/betterAuth/auth.ts + app-level
// auth queries. The auth config lives in betterAuth/auth.ts
// per the official Convex integration docs.
import { betterAuth } from 'better-auth';
import { v } from 'convex/values';
import { components, internal } from './_generated/api';
import { internalAction, query } from './_generated/server';
import { createAuthOptions } from './betterAuth/auth';
import { getIdentityId } from './lib/identity';
import { findAuthIdentity } from './lib/verifiedEmail';

export {
  authComponent,
  createAuth,
  createAuthOptions,
} from './betterAuth/auth';

// NOTE: Get current authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return identity;
  },
});

/** The signed-in member's email and whether it is verified. */
export const getEmailVerification = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ email: v.string(), emailVerified: v.boolean() })
  ),
  handler: async (ctx) => {
    const identityId = await getIdentityId(ctx);
    if (!identityId) return null;
    const identity = await findAuthIdentity(ctx, identityId);
    return identity
      ? { email: identity.email, emailVerified: identity.emailVerified }
      : null;
  },
});

// OAuth client identifiers are public values required by the native SDK.
// Provider secrets never leave the Better Auth server configuration.
export const getSocialAuthConfig = query({
  args: {},
  returns: v.object({
    apple: v.boolean(),
    google: v.union(
      v.null(),
      v.object({
        webClientId: v.string(),
        iosClientId: v.union(v.null(), v.string()),
      })
    ),
  }),
  handler: async () => {
    const google =
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            webClientId: process.env.GOOGLE_CLIENT_ID,
            iosClientId: process.env.GOOGLE_IOS_CLIENT_ID ?? null,
          }
        : null;

    return {
      apple: Boolean(
        process.env.APPLE_CLIENT_ID &&
          process.env.APPLE_CLIENT_SECRET &&
          process.env.APPLE_APP_BUNDLE_IDENTIFIER
      ),
      google,
    };
  },
});

/** Public reset requests acknowledge first; eligibility and delivery stay here. */
export const sendPasswordReset = internalAction({
  args: { email: v.string(), retry: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, { email, retry }) => {
    try {
      const identity = await ctx.runQuery(
        components.betterAuth.users.getUserByEmail,
        { email }
      );
      if (!identity?.emailVerified) return null;
      // Internal API use bypasses only the HTTP hook that queues this action.
      const auth = betterAuth({ ...createAuthOptions(ctx), hooks: undefined });
      await auth.api.requestPasswordReset({
        body: { email, redirectTo: 'native://reset-password' },
      });
    } catch {
      console.error('Password reset delivery failed');
      if (!retry) {
        await ctx.scheduler.runAfter(60_000, internal.auth.sendPasswordReset, {
          email,
          retry: true,
        });
      }
    }
    return null;
  },
});
