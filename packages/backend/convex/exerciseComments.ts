import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';

/** List all comments for an exercise, ordered by createdAt ascending. */
export const listComments = query({
  args: {
    exerciseId: v.id('exercises'),
  },
  handler: async (ctx, args) => {
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const body = args.body.trim();

    if (!body) throw new ConvexError('EMPTY_COMMENT');

    const userId = identity.subject;

    return await ctx.db.insert('exerciseComments', {
      exerciseId: args.exerciseId,
      userId,
      body,
      createdAt: Date.now(),
    });
  },
});
