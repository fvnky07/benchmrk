// NOTE: Public profile management API - re-exports Better Auth component functions
import { v } from 'convex/values';
import { components } from './_generated/api';
import { mutation, query } from './_generated/server';

/**
 * Generate an upload URL for profile picture uploads
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.runMutation(
      components.betterAuth.profile.generateUploadUrl,
      { userId: identity.subject }
    );
  },
});

/**
 * Check if a username is available
 */
export const checkUsername = query({
  args: { username: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.betterAuth.profile.checkUsername, {
      username: args.username,
    });
  },
});

export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.runQuery(components.betterAuth.profile.getCurrentProfile, {
      userId: identity.subject,
    });
  },
});

export const suggestUsername = query({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.runQuery(components.betterAuth.profile.suggestUsername, {
      userId: identity.subject,
    });
  },
});

/**
 * Update user profile (username, bio, image)
 */
export const updateProfile = mutation({
  args: {
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');
    return await ctx.runMutation(components.betterAuth.profile.updateProfile, {
      userId: identity.subject,
      username: args.username,
      bio: args.bio,
      imageStorageId: args.imageStorageId,
    });
  },
});
