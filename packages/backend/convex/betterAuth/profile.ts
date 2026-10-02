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

/** Whether a (lowercase) username is free, ignoring the member who already holds it. */
export const checkUsername = query({
  args: { username: v.string(), exceptUserId: v.optional(v.string()) },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const holder = await ctx.db
      .query('user')
      .withIndex('username', (q) => q.eq('username', args.username))
      .first();

    return holder === null || holder._id === args.exceptUserId;
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

/** Stores profile changes the app has already validated. */
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
    const image = args.imageStorageId
      ? await ctx.storage.getUrl(args.imageStorageId)
      : null;
    await ctx.db.patch(user._id, {
      ...(args.username !== undefined && { username: args.username }),
      ...(args.bio !== undefined && { bio: args.bio }),
      ...(image && { image }),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
