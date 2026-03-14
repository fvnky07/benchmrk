import { v } from 'convex/values';

import { mutation, query } from './_generated/server';

const exerciseConfigValidator = v.object({
  exerciseId: v.id('exercises'),
  sets: v.number(),
  reps: v.number(),
  weight: v.number(),
});

export const addExercisesToWorkout = mutation({
  args: {
    workoutId: v.id('workouts'),
    exercises: v.array(exerciseConfigValidator),
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

    const insertedIds = [];

    for (const [index, exercise] of args.exercises.entries()) {
      const existingExercise = await ctx.db.get(exercise.exerciseId);
      if (!existingExercise) {
        throw new Error('Exercise not found');
      }

      const workoutExerciseId = await ctx.db.insert('workoutExercises', {
        workoutId: args.workoutId,
        exerciseId: exercise.exerciseId,
        order: index,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight,
      });

      insertedIds.push(workoutExerciseId);
    }

    return insertedIds;
  },
});

export const getWorkoutExercises = query({
  args: {
    workoutId: v.id('workouts'),
  },
  handler: async (ctx, args) => {
    const workoutExercises = await ctx.db
      .query('workoutExercises')
      .withIndex('by_workout', (q) => q.eq('workoutId', args.workoutId))
      .collect();

    const ordered = workoutExercises.sort((a, b) => a.order - b.order);
    const joined = [];

    for (const workoutExercise of ordered) {
      const exercise = await ctx.db.get(workoutExercise.exerciseId);
      if (!exercise) {
        continue;
      }

      joined.push({
        _id: workoutExercise._id,
        workoutId: workoutExercise.workoutId,
        exerciseId: workoutExercise.exerciseId,
        order: workoutExercise.order,
        sets: workoutExercise.sets,
        reps: workoutExercise.reps,
        weight: workoutExercise.weight,
        exercise: {
          _id: exercise._id,
          slug: exercise.slug,
          name: exercise.name,
          description: exercise.description,
          imageUrl: exercise.imageUrl,
          category: exercise.category,
          muscleGroups: exercise.muscleGroups,
          instructions: exercise.instructions,
        },
      });
    }

    return joined;
  },
});

export const updateExerciseConfig = mutation({
  args: {
    workoutExerciseId: v.id('workoutExercises'),
    sets: v.number(),
    reps: v.number(),
    weight: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const workoutExercise = await ctx.db.get(args.workoutExerciseId);
    if (!workoutExercise) {
      throw new Error('Workout exercise not found');
    }

    const workout = await ctx.db.get(workoutExercise.workoutId);
    if (!workout || workout.userId !== identity.subject) {
      throw new Error('Workout not found');
    }

    await ctx.db.patch(args.workoutExerciseId, {
      sets: args.sets,
      reps: args.reps,
      weight: args.weight,
    });

    return args.workoutExerciseId;
  },
});

export const removeExerciseFromWorkout = mutation({
  args: {
    workoutExerciseId: v.id('workoutExercises'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const workoutExercise = await ctx.db.get(args.workoutExerciseId);
    if (!workoutExercise) {
      throw new Error('Workout exercise not found');
    }

    const workout = await ctx.db.get(workoutExercise.workoutId);
    if (!workout || workout.userId !== identity.subject) {
      throw new Error('Workout not found');
    }

    await ctx.db.delete(args.workoutExerciseId);
    return args.workoutExerciseId;
  },
});
