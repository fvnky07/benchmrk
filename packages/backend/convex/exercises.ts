import { v } from 'convex/values';

import { query } from './_generated/server';

export const listExercises = query({
  args: {},
  handler: async (ctx) => {
    const exercises = await ctx.db.query('exercises').collect();

    return exercises
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((exercise) => ({
        _id: exercise._id,
        slug: exercise.slug,
        name: exercise.name,
        description: exercise.description,
        imageUrl: exercise.imageUrl,
        category: exercise.category,
        muscleGroups: exercise.muscleGroups,
      }));
  },
});

export const getExerciseBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const exercise = await ctx.db
      .query('exercises')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();

    if (!exercise) {
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
    };
  },
});
