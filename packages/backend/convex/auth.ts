// NOTE: Re-exports from convex/betterAuth/auth.ts + app-level
// auth queries. The auth config lives in betterAuth/auth.ts
// per the official Convex integration docs.
import { v } from 'convex/values';
import { query } from './_generated/server';

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
