// NOTE: Re-exports from convex/betterAuth/auth.ts + app-level
// auth queries. The auth config lives in betterAuth/auth.ts
// per the official Convex integration docs.
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { authComponent } from './betterAuth/auth';

export {
  authComponent,
  createAuth,
  createAuthOptions,
} from './betterAuth/auth';

export function profileMediaDeletionAllowed(
  imageUrl: string | null | undefined,
  ownedMediaCount: number
): boolean {
  return !imageUrl || ownedMediaCount > 0;
}

// NOTE: Get current authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return identity;
  },
});

/**
 * Permanently removes the authenticated user's Benchmrk data and Better Auth
 * identity in one Convex transaction. Ownership is always derived from the
 * current session; callers cannot supply another user id.
 */
export const deleteAccount = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    const userId = identity.subject;

    // Preflight every operation that can fail before mutating user data.
    const authUser = await authComponent.getAnyUserById(ctx, userId);
    // `profile_media` is in schema.ts but generated dataModel.ts cannot be
    // refreshed without CONVEX_DEPLOYMENT; run `pnpm exec convex codegen`
    // after configuring that deployment.
    type ProfileMedia = { _id: string; userId: string; storageId: string };
    const profileMediaQuery = ctx.db.query(
      'profile_media' as never
    ) as unknown as {
      withIndex: (
        name: 'by_userId',
        callback: (query: {
          eq: (field: 'userId', value: string) => unknown;
        }) => unknown
      ) => { collect: () => Promise<ProfileMedia[]> };
    };
    const profileMedia = await profileMediaQuery
      .withIndex('by_userId', (query) => query.eq('userId', userId))
      .collect();
    if (!profileMediaDeletionAllowed(authUser?.image, profileMedia.length)) {
      throw new Error(
        'Profile media ownership cannot be verified; retry after migration'
      );
    }
    const workouts = await ctx.db
      .query('workouts')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
    const sessions = await ctx.db
      .query('workoutSessions')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
    const customExercises = await ctx.db
      .query('exercises')
      .withIndex('by_createdBy', (q) => q.eq('createdBy', userId))
      .collect();

    for (const workout of workouts) {
      const joins = await ctx.db
        .query('workoutExercises')
        .withIndex('by_workout', (q) => q.eq('workoutId', workout._id))
        .collect();
      for (const join of joins) await ctx.db.delete(join._id);
      await ctx.db.delete(workout._id);
    }
    for (const session of sessions) {
      const sessionExercises = await ctx.db
        .query('sessionExercises')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .collect();
      for (const sessionExercise of sessionExercises) {
        const sets = await ctx.db
          .query('sessionSets')
          .withIndex('by_session_exercise', (q) =>
            q.eq('sessionExerciseId', sessionExercise._id)
          )
          .collect();
        for (const set of sets) await ctx.db.delete(set._id);
        await ctx.db.delete(sessionExercise._id);
      }
      await ctx.db.delete(session._id);
    }
    const commentIds = new Set<string>();
    const ownedComments = await ctx.db
      .query('exerciseComments')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
    for (const comment of ownedComments) commentIds.add(comment._id);
    for (const exercise of customExercises) {
      const comments = await ctx.db
        .query('exerciseComments')
        .withIndex('by_exercise', (q) => q.eq('exerciseId', exercise._id))
        .collect();
      for (const comment of comments) commentIds.add(comment._id);
    }
    for (const commentId of commentIds) {
      await ctx.db.delete(commentId as never);
    }
    for (const exercise of customExercises) await ctx.db.delete(exercise._id);
    const preferences = await ctx.db
      .query('user_preferences')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
    for (const preference of preferences) await ctx.db.delete(preference._id);
    for (const media of profileMedia) {
      await ctx.storage.delete(media.storageId as never);
      await ctx.db.delete(media._id as never);
    }
    const adapter = (
      authComponent.adapter(ctx) as unknown as (options: unknown) => {
        deleteMany: (input: {
          model: string;
          where: Array<{ field: string; value: string }>;
        }) => Promise<unknown>;
        delete: (input: {
          model: string;
          where: Array<{ field: string; value: string }>;
        }) => Promise<unknown>;
      }
    )({});
    for (const model of [
      'session',
      'account',
      'twoFactor',
      'passkey',
      'oauthAccessToken',
      'oauthConsent',
    ]) {
      await adapter.deleteMany({
        model,
        where: [{ field: 'userId', value: userId }],
      });
    }
    await adapter.delete({
      model: 'user',
      where: [{ field: 'id', value: userId }],
    });
    return null;
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
