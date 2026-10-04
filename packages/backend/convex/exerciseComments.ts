import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { requireVisibleExercise } from './lib/exercises';
import { getIdentityId, requireIdentityId } from './lib/identity';

/** List all comments for an exercise, ordered by createdAt ascending. */
export const listComments = query({
  args: {
    exerciseId: v.id('exercises'),
  },
  handler: async (ctx, args) => {
    const identityId = await getIdentityId(ctx);
    await requireVisibleExercise(ctx, identityId ?? '', args.exerciseId);
    const comments = await ctx.db
      .query('exerciseComments')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', args.exerciseId))
      .collect();

    return comments
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((c) => ({
        _id: c._id,
        userId: c.userId,
        body: c.body,
        createdAt: c.createdAt,
      }));
  },
});

/** Add a comment to an exercise. Requires authentication. */
export const addComment = mutation({
  args: {
    exerciseId: v.id('exercises'),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    await requireVisibleExercise(ctx, userId, args.exerciseId);

    const body = args.body.trim();

    if (!body) throw new ConvexError('EMPTY_COMMENT');

    return await ctx.db.insert('exerciseComments', {
      exerciseId: args.exerciseId,
      userId,
      body,
      createdAt: Date.now(),
    });
  },
});
