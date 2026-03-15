import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';

export const addExerciseToSession = mutation({
  args: {
    sessionId: v.id('workoutSessions'),
    exerciseId: v.id('exercises'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) {
      throw new ConvexError('SESSION_NOT_FOUND');
    }
    if (session.status !== 'active') {
      throw new ConvexError('SESSION_NOT_ACTIVE');
    }

    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      throw new ConvexError('EXERCISE_NOT_FOUND');
    }

    const existing = await ctx.db
      .query('sessionExercises')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .collect();

    return await ctx.db.insert('sessionExercises', {
      sessionId: args.sessionId,
      exerciseId: args.exerciseId,
      order: existing.length + 1,
    });
  },
});

export const getSessionExercises = query({
  args: { sessionId: v.id('workoutSessions') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) return [];

    const sessionExercises = await ctx.db
      .query('sessionExercises')
      .withIndex('by_session_order', (q) => q.eq('sessionId', args.sessionId))
      .collect();

    const results = await Promise.all(
      sessionExercises.map(async (se) => {
        const exercise = await ctx.db.get(se.exerciseId);
        return { ...se, exercise };
      })
    );

    return results.filter((r) => r.exercise !== null);
  },
});

export const removeExerciseFromSession = mutation({
  args: { sessionExerciseId: v.id('sessionExercises') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const se = await ctx.db.get(args.sessionExerciseId);
    if (!se) throw new ConvexError('NOT_FOUND');

    const session = await ctx.db.get(se.sessionId);
    if (!session || session.userId !== identity.subject) {
      throw new ConvexError('NOT_FOUND');
    }

    await ctx.db.delete(args.sessionExerciseId);
  },
});

export const reorderExercises = mutation({
  args: {
    sessionId: v.id('workoutSessions'),
    orderedIds: v.array(v.id('sessionExercises')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) {
      throw new ConvexError('SESSION_NOT_FOUND');
    }

    const sessionExercises = await Promise.all(
      args.orderedIds.map((id) => ctx.db.get(id))
    );
    if (
      sessionExercises.some(
        (sessionExercise) =>
          !sessionExercise || sessionExercise.sessionId !== args.sessionId
      )
    ) {
      throw new ConvexError('SESSION_EXERCISE_NOT_FOUND');
    }

    await Promise.all(
      args.orderedIds.map((id, index) => ctx.db.patch(id, { order: index + 1 }))
    );
  },
});
