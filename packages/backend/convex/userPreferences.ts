import { v } from 'convex/values';

import { mutation, query } from './_generated/server';

/** Smart defaults — theme follows system, weight unit inferred at client */
const DEFAULT_PREFERENCES = {
  theme: 'system' as const,
  defaultRestTimer: 60,
  weightUnit: 'kg' as const,
  autoSaveWorkouts: true,
  syncToCloud: true,
  appleHealthEnabled: false,
  stravaEnabled: false,
};

/** Get preferences for the authenticated user. Returns defaults if none exist. */
export const getPreferences = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userId = identity.subject;

    const prefs = await ctx.db
      .query('user_preferences')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    if (prefs) return prefs;

    // Return defaults (not yet persisted)
    return {
      ...DEFAULT_PREFERENCES,
      userId,
      _persisted: false as const,
    };
  },
});

/** Partial update — creates the row on first save with defaults merged in. */
export const updatePreferences = mutation({
  args: {
    theme: v.optional(
      v.union(v.literal('light'), v.literal('dark'), v.literal('system'))
    ),
    defaultRestTimer: v.optional(v.number()),
    weightUnit: v.optional(v.union(v.literal('kg'), v.literal('lbs'))),
    autoSaveWorkouts: v.optional(v.boolean()),
    syncToCloud: v.optional(v.boolean()),
    appleHealthEnabled: v.optional(v.boolean()),
    stravaEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, updates) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const userId = identity.subject;
    const now = Date.now();

    const existing = await ctx.db
      .query('user_preferences')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...updates, updatedAt: now });
      return existing._id;
    }

    // First save — merge defaults with provided overrides
    return await ctx.db.insert('user_preferences', {
      ...DEFAULT_PREFERENCES,
      ...updates,
      userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Reset all preferences back to defaults. */
export const resetToDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const userId = identity.subject;

    const existing = await ctx.db
      .query('user_preferences')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...DEFAULT_PREFERENCES,
        updatedAt: Date.now(),
      });
    }
  },
});
