import { v } from 'convex/values';

import { mutation } from './_generated/server';
import { requireIdentityId } from './lib/identity';

/** A device's current Expo token belongs to its signed-in Benchmrk identity. */
export const register = mutation({
  args: {
    token: v.string(),
    platform: v.union(v.literal('ios'), v.literal('android')),
  },
  returns: v.null(),
  handler: async (ctx, { token, platform }) => {
    const userId = await requireIdentityId(ctx);
    const existing = await ctx.db
      .query('deviceTokens')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique();
    const registration = { userId, token, platform, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, registration);
    } else {
      await ctx.db.insert('deviceTokens', registration);
    }
    return null;
  },
});

/** Signing out removes this device, never another identity's registration. */
export const unregister = mutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, { token }) => {
    const userId = await requireIdentityId(ctx);
    const registration = await ctx.db
      .query('deviceTokens')
      .withIndex('by_token', (q) => q.eq('token', token))
      .unique();
    if (registration?.userId === userId) {
      await ctx.db.delete(registration._id);
    }
    return null;
  },
});
