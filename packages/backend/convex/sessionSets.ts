import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';

// addSet — creates a new pending (incomplete) set
export const addSet = mutation({
  args: {
    sessionExerciseId: v.id('sessionExercises'),
    sessionId: v.id('workoutSessions'),
    setNumber: v.number(),
    type: v.optional(
      v.union(
        v.literal('normal'),
        v.literal('warmup'),
        v.literal('dropset'),
        v.literal('failure')
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    // Verify session ownership
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) {
      throw new ConvexError('SESSION_NOT_FOUND');
    }
    if (session.status !== 'active') {
      throw new ConvexError('SESSION_NOT_ACTIVE');
    }

    return await ctx.db.insert('sessionSets', {
      sessionExerciseId: args.sessionExerciseId,
      sessionId: args.sessionId,
      setNumber: args.setNumber,
      type: args.type ?? 'normal',
      isCompleted: false,
    });
  },
});

// logSet — marks a set as completed with metric data
export const logSet = mutation({
  args: {
    setId: v.id('sessionSets'),
    reps: v.optional(v.number()),
    weightKg: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    distanceMeters: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const set = await ctx.db.get(args.setId);
    if (!set) throw new ConvexError('SET_NOT_FOUND');

    const session = await ctx.db.get(set.sessionId);
    if (!session || session.userId !== identity.subject) {
      throw new ConvexError('SET_NOT_FOUND');
    }
    if (session.status !== 'active') {
      throw new ConvexError('SESSION_NOT_ACTIVE');
    }

    await ctx.db.patch(args.setId, {
      reps: args.reps,
      weightKg: args.weightKg,
      durationSeconds: args.durationSeconds,
      distanceMeters: args.distanceMeters,
      isCompleted: true,
      completedAt: Date.now(),
    });
  },
});

// updateSet — edits metrics on an already-logged set
export const updateSet = mutation({
  args: {
    setId: v.id('sessionSets'),
    reps: v.optional(v.number()),
    weightKg: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    distanceMeters: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const set = await ctx.db.get(args.setId);
    if (!set) throw new ConvexError('SET_NOT_FOUND');

    const session = await ctx.db.get(set.sessionId);
    if (!session || session.userId !== identity.subject) {
      throw new ConvexError('SET_NOT_FOUND');
    }

    await ctx.db.patch(args.setId, {
      reps: args.reps,
      weightKg: args.weightKg,
      durationSeconds: args.durationSeconds,
      distanceMeters: args.distanceMeters,
    });
  },
});

// deleteSet — removes a set permanently
export const deleteSet = mutation({
  args: { setId: v.id('sessionSets') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Not authenticated');

    const set = await ctx.db.get(args.setId);
    if (!set) throw new ConvexError('SET_NOT_FOUND');

    const session = await ctx.db.get(set.sessionId);
    if (!session || session.userId !== identity.subject) {
      throw new ConvexError('SET_NOT_FOUND');
    }

    await ctx.db.delete(args.setId);
  },
});

// getSetsForSession — all sets for a session
export const getSetsForSession = query({
  args: { sessionId: v.id('workoutSessions') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) return [];

    return await ctx.db
      .query('sessionSets')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .collect();
  },
});
