import { ConvexError, type Infer, v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { mutation, type QueryCtx, query } from './_generated/server';
import { getIdentityId, requireIdentityId } from './lib/identity';
import { memberSettingsFields } from './schema';

const memberSettingsValidator = v.object(memberSettingsFields);

/** A member's settings as every client reads them. */
export type MemberSettings = Infer<typeof memberSettingsValidator>;

const DEFAULT_SETTINGS: MemberSettings = {
  appearance: 'system',
  units: 'kg',
  effortScale: 'RPE',
  defaultRestSeconds: 60,
  haptics: true,
  analyticsOptOut: false,
};

async function findSettings(
  ctx: QueryCtx,
  userId: string
): Promise<Doc<'memberSettings'> | null> {
  return ctx.db
    .query('memberSettings')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .unique();
}

/** Saved settings with defaults filling anything never saved. */
export async function readMemberSettings(
  ctx: QueryCtx,
  userId: string
): Promise<MemberSettings> {
  const saved = await findSettings(ctx, userId);
  if (!saved) return DEFAULT_SETTINGS;
  const {
    _id,
    _creationTime,
    userId: _owner,
    updatedAt: _updatedAt,
    ...settings
  } = saved;
  return { ...DEFAULT_SETTINGS, ...settings };
}

export const get = query({
  args: {},
  returns: v.union(memberSettingsValidator, v.null()),
  handler: async (ctx) => {
    const userId = await getIdentityId(ctx);
    if (!userId) return null;
    return readMemberSettings(ctx, userId);
  },
});

export const update = mutation({
  args: {
    appearance: v.optional(memberSettingsFields.appearance),
    units: v.optional(memberSettingsFields.units),
    effortScale: v.optional(memberSettingsFields.effortScale),
    defaultRestSeconds: v.optional(memberSettingsFields.defaultRestSeconds),
    haptics: v.optional(memberSettingsFields.haptics),
    analyticsOptOut: v.optional(memberSettingsFields.analyticsOptOut),
  },
  returns: v.null(),
  handler: async (ctx, changes) => {
    const userId = await requireIdentityId(ctx);
    if (
      changes.defaultRestSeconds !== undefined &&
      (!Number.isInteger(changes.defaultRestSeconds) ||
        changes.defaultRestSeconds < 0)
    ) {
      throw new ConvexError('INVALID_DEFAULT_REST');
    }

    const saved = await findSettings(ctx, userId);
    const updatedAt = Date.now();
    if (saved) {
      await ctx.db.patch(saved._id, { ...changes, updatedAt });
    } else {
      await ctx.db.insert('memberSettings', {
        ...DEFAULT_SETTINGS,
        ...changes,
        userId,
        updatedAt,
      });
    }
    return null;
  },
});

export const reset = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireIdentityId(ctx);
    const saved = await findSettings(ctx, userId);
    if (saved) {
      await ctx.db.replace(saved._id, {
        ...DEFAULT_SETTINGS,
        userId,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});
