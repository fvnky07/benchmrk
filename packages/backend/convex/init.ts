import { internalMutation } from './_generated/server';
import { EXERCISE_CATALOG } from './lib/exerciseCatalog';

/** Adds catalog Exercises that aren't in the database yet; never rewrites one. */
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    let seededCount = 0;

    for (const exercise of EXERCISE_CATALOG) {
      const existing = await ctx.db
        .query('exercises')
        .withIndex('by_slug', (q) => q.eq('slug', exercise.slug))
        .first();

      if (!existing) {
        await ctx.db.insert('exercises', exercise);
        seededCount += 1;
      }
    }

    return { seededCount, totalExercises: EXERCISE_CATALOG.length };
  },
});
