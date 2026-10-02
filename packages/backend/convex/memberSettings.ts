import { ConvexError, type Infer, v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from './_generated/server';
import { toKg, type WeightUnit } from './domain/units';
import { getIdentityId, requireIdentityId } from './lib/identity';
import {
  memberSettingsChangeFields,
  memberSettingsFields,
  type quickActionIdValidator,
} from './schema';

const memberSettingsValidator = v.object(memberSettingsFields);

/** A member's settings as every client reads them. */
export type MemberSettings = Infer<typeof memberSettingsValidator>;
export type QuickActionId = Infer<typeof quickActionIdValidator>;

/** Spec order; Plates is optional and starts hidden. */
const DEFAULT_QUICK_ACTIONS: MemberSettings['quickActions'] = [
  { id: 'wand', visible: true },
  { id: 'addSet', visible: true },
  { id: 'info', visible: true },
  { id: 'swap', visible: true },
  { id: 'note', visible: true },
  { id: 'setup', visible: true },
  { id: 'plates', visible: false },
];

/** 1.25 kg, or 2.5 lb for members who train in pounds. */
const DEFAULT_SMALLEST_INCREMENT_KG: Record<WeightUnit, number> = {
  kg: 1.25,
  lb: toKg(2.5, 'lb'),
};

const DEFAULT_SETTINGS: MemberSettings = {
  appearance: 'system',
  units: 'kg',
  effortScale: 'RPE',
  defaultRestSeconds: 60,
  haptics: true,
  analyticsOptOut: false,
  quickActions: DEFAULT_QUICK_ACTIONS,
  swipeHintDismissed: false,
  restEndSound: true,
  overloadTargets: true,
  targetsOffExerciseIds: [],
  smallestIncrementKg: DEFAULT_SMALLEST_INCREMENT_KG.kg,
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

/** A saved order keeps its choices; chips added since then go to the end. */
function withEveryQuickAction(
  saved: MemberSettings['quickActions']
): MemberSettings['quickActions'] {
  const savedIds = new Set<QuickActionId>(saved.map((action) => action.id));
  return [
    ...saved,
    ...DEFAULT_QUICK_ACTIONS.filter((action) => !savedIds.has(action.id)),
  ];
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
    ...changes
  } = saved;
  const settings = { ...DEFAULT_SETTINGS, ...changes };
  return {
    ...settings,
    quickActions: withEveryQuickAction(settings.quickActions),
    smallestIncrementKg:
      changes.smallestIncrementKg ??
      DEFAULT_SMALLEST_INCREMENT_KG[settings.units],
  };
}

type SettingsChanges = Partial<
  Omit<Doc<'memberSettings'>, '_id' | '_creationTime' | 'userId' | 'updatedAt'>
>;

/** Saves a member's changed settings, creating their settings on first save. */
export async function saveMemberSettings(
  ctx: MutationCtx,
  userId: string,
  changes: SettingsChanges
) {
  const saved = await findSettings(ctx, userId);
  const updatedAt = Date.now();
  if (saved) {
    await ctx.db.patch(saved._id, { ...changes, updatedAt });
  } else {
    await ctx.db.insert('memberSettings', { ...changes, userId, updatedAt });
  }
}

// Switching Overload targets replans the active Workout, so it has its own
// mutation (overload.setTargetsEnabled).
const {
  overloadTargets: _overloadTargets,
  targetsOffExerciseIds: _targetsOffExerciseIds,
  ...updatableFields
} = memberSettingsChangeFields;

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
  args: updatableFields,
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
    if (
      changes.quickActions !== undefined &&
      (changes.quickActions.length !== DEFAULT_QUICK_ACTIONS.length ||
        new Set(changes.quickActions.map((action) => action.id)).size !==
          DEFAULT_QUICK_ACTIONS.length)
    ) {
      throw new ConvexError('INVALID_QUICK_ACTIONS');
    }
    if (
      changes.smallestIncrementKg !== undefined &&
      !(changes.smallestIncrementKg > 0 && changes.smallestIncrementKg <= 10)
    ) {
      throw new ConvexError('INVALID_SMALLEST_INCREMENT');
    }

    await saveMemberSettings(ctx, userId, changes);
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
      await ctx.db.replace(saved._id, { userId, updatedAt: Date.now() });
    }
    return null;
  },
});
