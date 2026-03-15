import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';

export const startSession = mutation({
  args: {
    name: v.string(),
    workoutTemplateId: v.optional(v.id('workouts')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }
    const userId = identity.subject;

    const existing = await ctx.db
      .query('workoutSessions')
      .withIndex('by_user_status', (q) =>
        q.eq('userId', userId).eq('status', 'active')
      )
      .first();
    if (existing) {
      throw new ConvexError('ACTIVE_SESSION_EXISTS');
    }

    return await ctx.db.insert('workoutSessions', {
      userId,
      name: args.name,
      status: 'active',
      startedAt: Date.now(),
      workoutTemplateId: args.workoutTemplateId,
    });
  },
});

export const completeSession = mutation({
  args: { sessionId: v.id('workoutSessions') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) {
      throw new ConvexError('SESSION_NOT_FOUND');
    }

    const completedAt = Date.now();
    await ctx.db.patch(args.sessionId, {
      status: 'completed',
      completedAt,
      durationSeconds: Math.floor((completedAt - session.startedAt) / 1000),
    });
  },
});

export const abandonSession = mutation({
  args: { sessionId: v.id('workoutSessions') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) {
      throw new ConvexError('SESSION_NOT_FOUND');
    }

    await ctx.db.patch(args.sessionId, {
      status: 'abandoned',
      completedAt: Date.now(),
    });
  },
});

export const getActiveSession = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query('workoutSessions')
      .withIndex('by_user_status', (q) =>
        q.eq('userId', identity.subject).eq('status', 'active')
      )
      .first();
  },
});

export const getSession = query({
  args: { sessionId: v.id('workoutSessions') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== identity.subject) {
      return null;
    }
    return session;
  },
});
