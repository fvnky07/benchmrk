// NOTE: Profile management mutations and queries
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Generate an upload URL for profile picture uploads
 */
export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		return await ctx.storage.generateUploadUrl();
	},
});

/**
 * Check if a username is available
 */
export const checkUsername = query({
	args: { username: v.string() },
	returns: v.boolean(),
	handler: async (ctx, args) => {
		const existingUser = await ctx.db
			.query("user")
			.withIndex("username", (q) => q.eq("username", args.username))
			.first();

		return existingUser === null;
	},
});

/**
 * Update user profile (username, bio, image)
 * Requires authentication
 */
export const updateProfile = mutation({
	args: {
		userId: v.id("user"),
		username: v.optional(v.string()),
		bio: v.optional(v.string()),
		imageStorageId: v.optional(v.id("_storage")),
	},
	handler: async (ctx, args) => {
		const { userId, username, bio, imageStorageId } = args;

		// Get the user
		const user = await ctx.db.get(userId);
		if (!user) {
			throw new Error("User not found");
		}

		// Check if username is already taken (if username is being updated)
		if (username && username !== user.username) {
			const existingUser = await ctx.db
				.query("user")
				.withIndex("username", (q) => q.eq("username", username))
				.first();

			if (existingUser) {
				throw new Error("Username already taken");
			}
		}

		// Get image URL from storage ID if provided
		let imageUrl = user.image;
		if (imageStorageId) {
			imageUrl = await ctx.storage.getUrl(imageStorageId);
		}

		// Update the user
		await ctx.db.patch(userId, {
			...(username && { username }),
			...(bio !== undefined && { bio }),
			...(imageUrl && { image: imageUrl }),
			updatedAt: Date.now(),
		});

		return { success: true };
	},
});
