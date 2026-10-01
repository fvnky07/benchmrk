import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { defaultStepKg } from './domain/units';
import { getIdentityId, requireIdentityId } from './lib/identity';
import { readMemberSettings } from './memberSettings';
import { equipmentValidator, exerciseTypeValidator } from './schema';

/** The shared catalog plus the signed-in member's own custom Exercises. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getIdentityId(ctx);
    const catalog = await ctx.db
      .query('exercises')
      .withIndex('by_createdBy', (q) => q.eq('createdBy', undefined))
      .collect();
    const custom = userId
      ? await ctx.db
          .query('exercises')
          .withIndex('by_createdBy', (q) => q.eq('createdBy', userId))
          .collect()
      : [];
    const { units } = userId
      ? await readMemberSettings(ctx, userId)
      : { units: 'kg' as const };

    return [...catalog, ...custom]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((exercise) => ({
        _id: exercise._id,
        slug: exercise.slug,
        name: exercise.name,
        type: exercise.type,
        equipment: exercise.equipment,
        category: exercise.category,
        muscleGroups: exercise.muscleGroups,
        isCustom: exercise.createdBy !== undefined,
        defaultStepKg: defaultStepKg(exercise.equipment, units),
      }));
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const userId = await getIdentityId(ctx);
    const exercise = await ctx.db
      .query('exercises')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();

    if (
      !exercise ||
      (exercise.createdBy !== undefined && exercise.createdBy !== userId)
    ) {
      return null;
    }

    return {
      _id: exercise._id,
      slug: exercise.slug,
      name: exercise.name,
      description: exercise.description,
      imageUrl: exercise.imageUrl,
      category: exercise.category,
      muscleGroups: exercise.muscleGroups,
      instructions: exercise.instructions,
      type: exercise.type,
      equipment: exercise.equipment,
      isCustom: exercise.createdBy !== undefined,
    };
  },
});

/** Creates a permanent Exercise that only its creator can see and use. */
export const createCustom = mutation({
  args: {
    name: v.string(),
    type: exerciseTypeValidator,
    equipment: equipmentValidator,
  },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const name = args.name.trim();
    if (!name) throw new ConvexError('EMPTY_EXERCISE_NAME');

    const base =
      name
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, '-')
        .replaceAll(/^-|-$/g, '') || 'exercise';
    let slug = `${base}-${Date.now().toString(36)}`;
    let attempt = 1;
    while (
      await ctx.db
        .query('exercises')
        .withIndex('by_slug', (q) => q.eq('slug', slug))
        .first()
    ) {
      slug = `${base}-${Date.now().toString(36)}-${attempt}`;
      attempt += 1;
    }

    const exerciseId = await ctx.db.insert('exercises', {
      slug,
      name,
      type: args.type,
      equipment: args.equipment,
      createdBy: userId,
    });
    return { exerciseId, slug };
  },
});
