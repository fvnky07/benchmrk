// Profile API for the signed-in member. Profile fields live on the Better Auth
// user, so these functions authenticate here and pass the identity id on.
import { ConvexError, v } from 'convex/values';
import { components } from './_generated/api';
import { mutation, query } from './_generated/server';
import { getIdentityId, requireIdentityId } from './lib/identity';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const BIO_MAX_LENGTH = 150;

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identityId = await requireIdentityId(ctx);
    return await ctx.runMutation(
      components.betterAuth.profile.generateUploadUrl,
      { userId: identityId }
    );
  },
});

/** Usernames are case-insensitive; your own current username counts as free. */
export const checkUsername = query({
  args: { username: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const identityId = await getIdentityId(ctx);
    return await ctx.runQuery(components.betterAuth.profile.checkUsername, {
      username: args.username.toLowerCase(),
      exceptUserId: identityId ?? undefined,
    });
  },
});

export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    const identityId = await getIdentityId(ctx);
    if (!identityId) return null;
    return await ctx.runQuery(components.betterAuth.profile.getCurrentProfile, {
      userId: identityId,
    });
  },
});

export const suggestUsername = query({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const identityId = await requireIdentityId(ctx);
    return await ctx.runQuery(components.betterAuth.profile.suggestUsername, {
      userId: identityId,
    });
  },
});

/** Changes username, bio or photo; usernames are stored lowercase and unique. */
export const updateProfile = mutation({
  args: {
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const identityId = await requireIdentityId(ctx);
    const username = args.username?.toLowerCase();

    if (username !== undefined) {
      if (!USERNAME_PATTERN.test(username)) {
        throw new ConvexError('INVALID_USERNAME');
      }
      const isFree = await ctx.runQuery(
        components.betterAuth.profile.checkUsername,
        { username, exceptUserId: identityId }
      );
      if (!isFree) throw new ConvexError('USERNAME_TAKEN');
    }
    if (args.bio !== undefined && args.bio.length > BIO_MAX_LENGTH) {
      throw new ConvexError('BIO_TOO_LONG');
    }

    return await ctx.runMutation(components.betterAuth.profile.updateProfile, {
      userId: identityId,
      username,
      bio: args.bio,
      imageStorageId: args.imageStorageId,
    });
  },
});
