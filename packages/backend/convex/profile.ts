// NOTE: Public profile management API - re-exports Better Auth component functions
import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";

/**
 * Generate an upload URL for profile picture uploads
 */
export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		return await ctx.runMutation(
			components.betterAuth.profile.generateUploadUrl,
			{},
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

/**
 * Update user profile (username, bio, image)
 */
export const updateProfile = mutation({
	args: {
		userId: v.string(),
		username: v.optional(v.string()),
		bio: v.optional(v.string()),
		imageStorageId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await ctx.runMutation(components.betterAuth.profile.updateProfile, {
			userId: args.userId as any,
			username: args.username,
			bio: args.bio,
			imageStorageId: args.imageStorageId as any,
		});
	},
});
