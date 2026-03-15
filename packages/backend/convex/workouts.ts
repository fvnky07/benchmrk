import { ConvexError, v } from 'convex/values';

import { components } from './_generated/api';
import { mutation, query } from './_generated/server';

const FREE_TIER_WORKOUT_LIMIT = 3;

export const createWorkout = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const userId = identity.subject;
    const existing = await ctx.db
      .query('workouts')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .take(FREE_TIER_WORKOUT_LIMIT + 1);

    if (existing.length >= FREE_TIER_WORKOUT_LIMIT) {
      throw new ConvexError('FREE_TIER_LIMIT');
    }

    return await ctx.db.insert('workouts', {
      userId,
      name: args.name,
      createdAt: Date.now(),
    });
  },
});

export const listWorkouts = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;
    const workouts = await ctx.db
      .query('workouts')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    return workouts.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getWorkout = query({
  args: {
    workoutId: v.id('workouts'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== identity.subject) {
      return null;
    }

    return workout;
  },
});

export const deleteWorkout = mutation({
  args: {
    workoutId: v.id('workouts'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== identity.subject) {
      throw new Error('Workout not found');
    }

    const workoutExercises = await ctx.db
      .query('workoutExercises')
      .withIndex('by_workout', (q) => q.eq('workoutId', args.workoutId))
      .collect();

    for (const workoutExercise of workoutExercises) {
      await ctx.db.delete(workoutExercise._id);
    }

    await ctx.db.delete(args.workoutId);
    return args.workoutId;
  },
});

export const getRecentWorkoutsWithProfiles = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const workouts = await ctx.db.query('workouts').order('desc').take(limit);

    const workoutsWithProfiles = [];

    for (const workout of workouts) {
      const user = await ctx.runQuery(components.betterAuth.users.getUser, {
        userId: workout.userId,
      });

      const workoutExercises = await ctx.db
        .query('workoutExercises')
        .withIndex('by_workout', (q) => q.eq('workoutId', workout._id))
        .collect();

      const totalVolume = workoutExercises.reduce((sum, we) => {
        return sum + we.sets * we.reps * we.weight;
      }, 0);

      const totalSets = workoutExercises.reduce((sum, we) => sum + we.sets, 0);

      workoutsWithProfiles.push({
        _id: workout._id,
        name: workout.name,
        createdAt: workout.createdAt,
        exerciseCount: workoutExercises.length,
        totalSets,
        totalVolume,
        user: user
          ? {
              userId: user.userId,
              name: user.name,
              username: user.username,
              image: user.image,
            }
          : {
              userId: workout.userId,
              name: 'Anonymous',
              username: null,
              image: null,
            },
      });
    }

    return workoutsWithProfiles;
  },
});
