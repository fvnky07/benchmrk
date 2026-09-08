// NOTE: Profile management mutations and queries
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, type QueryCtx, query } from './_generated/server';

function normalizeUsername(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase()
    .slice(0, 20);

  return normalized.length >= 3 ? normalized : 'member';
}

async function usernameExists(
  ctx: QueryCtx,
  username: string
): Promise<boolean> {
  const user = await ctx.db
    .query('user')
    .withIndex('username', (q) => q.eq('username', username))
    .first();

  return user !== null;
}

/**
 * Generate an upload URL for profile picture uploads.
 * Upload URLs are only useful to authenticated members.
 */
export const generateUploadUrl = mutation({
  args: { userId: v.string() },
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
      .query('user')
      .withIndex('username', (q) => q.eq('username', args.username))
      .first();

    return existingUser === null;
  },
});

export const suggestUsername = query({
  args: { userId: v.string() },
  returns: v.string(),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId as Id<'user'>);
    if (!user) {
      throw new Error('User not found');
    }

    const base = normalizeUsername(
      user.name || user.email.split('@')[0] || 'member'
    );

    if (!(await usernameExists(ctx, base))) {
      return base;
    }

    for (let suffix = 2; suffix <= 99; suffix++) {
      const suffixText = String(suffix);
      const candidate = `${base.slice(0, 20 - suffixText.length)}${suffixText}`;
      if (!(await usernameExists(ctx, candidate))) {
        return candidate;
      }
    }

    const stableSuffix =
      userId
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(-8)
        .toLowerCase() || 'member';
    const candidate = `${base.slice(0, 11)}_${stableSuffix}`.slice(0, 20);
    if (await usernameExists(ctx, candidate)) {
      throw new Error('Unable to assign a unique username');
    }

    return candidate;
  },
});

export const getCurrentProfile = query({
  args: { userId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      id: v.string(),
      name: v.string(),
      email: v.string(),
      username: v.union(v.null(), v.string()),
      bio: v.union(v.null(), v.string()),
      image: v.union(v.null(), v.string()),
    })
  ),
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId as Id<'user'>);
    if (!user) return null;
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username ?? null,
      bio: user.bio ?? null,
      image: user.image ?? null,
    };
  },
});

/**
 * Update user profile (username, bio, image)
 * Requires authentication
 */
export const updateProfile = mutation({
  args: {
    userId: v.string(),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    imageStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId as Id<'user'>);
    if (!user) throw new Error('User not found');
    const { username, bio, imageStorageId } = args;
    if (username) {
      if (
        username.length < 3 ||
        username.length > 20 ||
        !/^[a-zA-Z0-9_]+$/.test(username)
      ) {
        throw new Error(
          'Username must be 3-20 characters using only letters, numbers, and underscores'
        );
      }
    }
    if (username && username !== user.username) {
      const existingUser = await ctx.db
        .query('user')
        .withIndex('username', (q) => q.eq('username', username))
        .first();
      if (existingUser) throw new Error('Username already taken');
    }
    let imageUrl = user.image;
    if (imageStorageId) imageUrl = await ctx.storage.getUrl(imageStorageId);
    await ctx.db.patch(user._id, {
      ...(username && { username }),
      ...(bio !== undefined && { bio }),
      ...(imageUrl && { image: imageUrl }),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
