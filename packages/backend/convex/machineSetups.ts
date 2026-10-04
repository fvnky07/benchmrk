import { ConvexError, v } from 'convex/values';

import { mutation } from './_generated/server';
import type { Equipment } from './domain/units';
import { requireVisibleExercise } from './lib/exercises';
import { requireIdentityId } from './lib/identity';
import { machinePositionsValidator } from './schema';

const MAX_CUSTOM_FIELDS = 8;
const MAX_FIELD_LENGTH = 40;

/** Machine setup applies to machine and cable Exercises only. */
export function hasMachineSetup(equipment: Equipment): boolean {
  return equipment === 'machine' || equipment === 'cable';
}

/**
 * Saves the member's one Machine setup for an Exercise: labelled positions
 * plus custom fields. It shows in every Workout with the Exercise.
 */
export const save = mutation({
  args: {
    exerciseId: v.id('exercises'),
    positions: machinePositionsValidator,
    custom: v.array(v.object({ label: v.string(), value: v.string() })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const exercise = await requireVisibleExercise(ctx, userId, args.exerciseId);
    if (!hasMachineSetup(exercise.equipment)) {
      throw new ConvexError('MACHINE_SETUP_NOT_SUPPORTED');
    }
    const custom = args.custom
      .map((field) => ({
        label: field.label.trim(),
        value: field.value.trim(),
      }))
      .filter((field) => field.label && field.value);
    const positions = Object.values(args.positions);
    if (
      custom.length > MAX_CUSTOM_FIELDS ||
      custom.some(
        (field) =>
          field.label.length > MAX_FIELD_LENGTH ||
          field.value.length > MAX_FIELD_LENGTH
      ) ||
      positions.some((value) => value === undefined || !Number.isFinite(value))
    ) {
      throw new ConvexError('INVALID_MACHINE_SETUP');
    }
    if (positions.length === 0 && custom.length === 0) {
      throw new ConvexError('EMPTY_MACHINE_SETUP');
    }

    const existing = await ctx.db
      .query('machineSetups')
      .withIndex('by_user_exercise', (q) =>
        q.eq('userId', userId).eq('exerciseId', exercise._id)
      )
      .unique();
    const setup = { positions: args.positions, custom, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.replace(existing._id, {
        ...setup,
        userId,
        exerciseId: exercise._id,
      });
    } else {
      await ctx.db.insert('machineSetups', {
        ...setup,
        userId,
        exerciseId: exercise._id,
      });
    }
    return null;
  },
});

/** Removes the member's Machine setup for an Exercise. */
export const remove = mutation({
  args: { exerciseId: v.id('exercises') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const existing = await ctx.db
      .query('machineSetups')
      .withIndex('by_user_exercise', (q) =>
        q.eq('userId', userId).eq('exerciseId', args.exerciseId)
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});
