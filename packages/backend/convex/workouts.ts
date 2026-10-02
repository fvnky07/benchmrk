import { ConvexError, type ObjectType, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from './_generated/server';
import { isValidRpe, rpeFromEffort } from './domain/effort';
import { defaultStepKg } from './domain/units';
import { requireVisibleExercise } from './lib/exercises';
import { getIdentityId, requireIdentityId } from './lib/identity';
import { readMemberSettings } from './memberSettings';
import { routineExercisesOf } from './routines';
import { memberSettingsFields, setTypeValidator } from './schema';

const DEFAULT_SETS_FOR_ADDED_EXERCISE = 3;
const DEFAULT_REP_RANGE = { min: 6, max: 10 };

async function requireOwnedWorkout(
  ctx: QueryCtx,
  userId: string,
  workoutId: Id<'workouts'>
): Promise<Doc<'workouts'>> {
  const workout = await ctx.db.get(workoutId);
  if (!workout || workout.userId !== userId) {
    throw new ConvexError('WORKOUT_NOT_FOUND');
  }
  return workout;
}

function requireActive(workout: Doc<'workouts'>) {
  if (workout.status !== 'active') {
    throw new ConvexError('WORKOUT_NOT_ACTIVE');
  }
}

async function requireOwnedSet(
  ctx: QueryCtx,
  userId: string,
  setId: Id<'sets'>
) {
  const set = await ctx.db.get(setId);
  if (!set || set.userId !== userId) throw new ConvexError('SET_NOT_FOUND');
  const workout = await requireOwnedWorkout(ctx, userId, set.workoutId);
  return { set, workout };
}

async function requireOwnedWorkoutExercise(
  ctx: QueryCtx,
  userId: string,
  workoutExerciseId: Id<'workoutExercises'>
) {
  const workoutExercise = await ctx.db.get(workoutExerciseId);
  if (!workoutExercise) throw new ConvexError('WORKOUT_NOT_FOUND');
  const workout = await requireOwnedWorkout(
    ctx,
    userId,
    workoutExercise.workoutId
  );
  return { workout, workoutExercise };
}

async function findActiveWorkout(ctx: QueryCtx, userId: string) {
  return ctx.db
    .query('workouts')
    .withIndex('by_user_status', (q) =>
      q.eq('userId', userId).eq('status', 'active')
    )
    .first();
}

async function workoutExercisesOf(ctx: QueryCtx, workoutId: Id<'workouts'>) {
  return ctx.db
    .query('workoutExercises')
    .withIndex('by_workout', (q) => q.eq('workoutId', workoutId))
    .collect();
}

async function setsOfExercise(
  ctx: QueryCtx,
  workoutExerciseId: Id<'workoutExercises'>
) {
  return ctx.db
    .query('sets')
    .withIndex('by_workoutExercise', (q) =>
      q.eq('workoutExerciseId', workoutExerciseId)
    )
    .collect();
}

async function setsOfWorkout(ctx: QueryCtx, workoutId: Id<'workouts'>) {
  return ctx.db
    .query('sets')
    .withIndex('by_workout', (q) => q.eq('workoutId', workoutId))
    .collect();
}

/** Planned Sets are every Set except warm-ups; progress counts the completed ones. */
function progressOf(sets: Doc<'sets'>[]) {
  const planned = sets.filter((set) => set.type !== 'warmup');
  return {
    done: planned.filter((set) => set.completedAt !== undefined).length,
    total: planned.length,
  };
}

async function insertPlannedSets(
  ctx: MutationCtx,
  workout: Doc<'workouts'>,
  workoutExercise: Pick<Doc<'workoutExercises'>, '_id' | 'exerciseId'>,
  count: number,
  firstOrder = 0
) {
  for (let order = firstOrder; order < firstOrder + count; order += 1) {
    await ctx.db.insert('sets', {
      userId: workout.userId,
      workoutId: workout._id,
      workoutExerciseId: workoutExercise._id,
      exerciseId: workoutExercise.exerciseId,
      order,
      type: 'normal',
    });
  }
}

async function workoutView(ctx: QueryCtx, workout: Doc<'workouts'>) {
  const exercises = await Promise.all(
    (await workoutExercisesOf(ctx, workout._id)).map(
      async (workoutExercise) => {
        const exercise = await ctx.db.get(workoutExercise.exerciseId);
        if (!exercise) throw new ConvexError('EXERCISE_NOT_FOUND');
        const sets = await setsOfExercise(ctx, workoutExercise._id);
        return {
          _id: workoutExercise._id,
          exerciseId: exercise._id,
          name: exercise.name,
          slug: exercise.slug,
          type: exercise.type,
          equipment: exercise.equipment,
          repRangeMin: workoutExercise.repRangeMin,
          repRangeMax: workoutExercise.repRangeMax,
          stepKg: workoutExercise.stepKg,
          sets: sets.map((set) => ({
            _id: set._id,
            order: set.order,
            type: set.type,
            weightKg: set.weightKg ?? null,
            reps: set.reps ?? null,
            durationSeconds: set.durationSeconds ?? null,
            distanceMeters: set.distanceMeters ?? null,
            rpe: set.rpe ?? null,
            completedAt: set.completedAt ?? null,
          })),
        };
      }
    )
  );

  return {
    _id: workout._id,
    name: workout.name,
    routineId: workout.routineId ?? null,
    status: workout.status,
    startedAt: workout.startedAt,
    finishedAt: workout.finishedAt ?? null,
    finishReason: workout.finishReason ?? null,
    progress: progressOf(await setsOfWorkout(ctx, workout._id)),
    exercises,
  };
}

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getIdentityId(ctx);
    if (!userId) return null;
    const workout = await findActiveWorkout(ctx, userId);
    return workout ? workoutView(ctx, workout) : null;
  },
});

export const get = query({
  args: { workoutId: v.id('workouts') },
  handler: async (ctx, args) => {
    const userId = await getIdentityId(ctx);
    if (!userId) return null;
    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== userId) return null;
    return workoutView(ctx, workout);
  },
});

/** Starts a Workout from a Routine, copying its plan, or from nothing. */
export const start = mutation({
  args: { routineId: v.optional(v.id('routines')) },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    if (await findActiveWorkout(ctx, userId)) {
      throw new ConvexError('ACTIVE_WORKOUT_EXISTS');
    }

    const routine = args.routineId ? await ctx.db.get(args.routineId) : null;
    if (args.routineId && (!routine || routine.userId !== userId)) {
      throw new ConvexError('ROUTINE_NOT_FOUND');
    }

    const workoutId = await ctx.db.insert('workouts', {
      userId,
      name: routine?.name ?? 'Workout',
      routineId: routine?._id,
      status: 'active',
      startedAt: Date.now(),
    });
    if (!routine) return workoutId;

    const workout = await ctx.db.get(workoutId);
    if (!workout) throw new ConvexError('WORKOUT_NOT_FOUND');
    for (const routineExercise of await routineExercisesOf(ctx, routine._id)) {
      const workoutExerciseId = await ctx.db.insert('workoutExercises', {
        workoutId,
        exerciseId: routineExercise.exerciseId,
        routineExerciseId: routineExercise._id,
        order: routineExercise.order,
        repRangeMin: routineExercise.repRangeMin,
        repRangeMax: routineExercise.repRangeMax,
        stepKg: routineExercise.stepKg,
        plannedRestSeconds: routineExercise.plannedRestSeconds,
      });
      await insertPlannedSets(
        ctx,
        workout,
        { _id: workoutExerciseId, exerciseId: routineExercise.exerciseId },
        routineExercise.targetSets
      );
    }
    return workoutId;
  },
});

export const addExercise = mutation({
  args: { workoutId: v.id('workouts'), exerciseId: v.id('exercises') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const workout = await requireOwnedWorkout(ctx, userId, args.workoutId);
    requireActive(workout);
    const exercise = await requireVisibleExercise(ctx, userId, args.exerciseId);
    const { units } = await readMemberSettings(ctx, userId);

    const workoutExerciseId = await ctx.db.insert('workoutExercises', {
      workoutId: workout._id,
      exerciseId: exercise._id,
      order: (await workoutExercisesOf(ctx, workout._id)).length,
      repRangeMin: DEFAULT_REP_RANGE.min,
      repRangeMax: DEFAULT_REP_RANGE.max,
      stepKg: defaultStepKg(exercise.equipment, units),
    });
    await insertPlannedSets(
      ctx,
      workout,
      { _id: workoutExerciseId, exerciseId: exercise._id },
      DEFAULT_SETS_FOR_ADDED_EXERCISE
    );
    return workoutExerciseId;
  },
});

/** Adds a Set: Working Sets go last, Warm-up Sets before the first Working Set. */
export const addSet = mutation({
  args: {
    workoutExerciseId: v.id('workoutExercises'),
    type: v.optional(setTypeValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { workout, workoutExercise } = await requireOwnedWorkoutExercise(
      ctx,
      userId,
      args.workoutExerciseId
    );
    requireActive(workout);
    const sets = await setsOfExercise(ctx, workoutExercise._id);
    if (args.type !== 'warmup') {
      await insertPlannedSets(ctx, workout, workoutExercise, 1, sets.length);
      return;
    }

    const firstWorking = sets.findIndex((set) => set.type !== 'warmup');
    const order = firstWorking === -1 ? sets.length : firstWorking;
    for (const later of sets.slice(order)) {
      await ctx.db.patch(later._id, { order: later.order + 1 });
    }
    await ctx.db.insert('sets', {
      userId: workout.userId,
      workoutId: workout._id,
      workoutExerciseId: workoutExercise._id,
      exerciseId: workoutExercise.exerciseId,
      order,
      type: 'warmup',
    });
  },
});

const setChangeArgs = {
  weightKg: v.optional(v.number()),
  reps: v.optional(v.number()),
  durationSeconds: v.optional(v.number()),
  distanceMeters: v.optional(v.number()),
  type: v.optional(setTypeValidator),
  /** Effort in the member's scale; null clears it. */
  effort: v.optional(
    v.union(
      v.null(),
      v.object({
        scale: memberSettingsFields.effortScale,
        value: v.number(),
      })
    )
  ),
};

/** Validates Set changes and turns entered effort into the stored RPE. */
function setPatch({
  effort,
  type,
  ...values
}: ObjectType<typeof setChangeArgs>): Partial<Doc<'sets'>> {
  if (
    Object.values(values).some(
      (value) => value !== undefined && !(Number.isFinite(value) && value >= 0)
    ) ||
    (values.reps !== undefined && !Number.isInteger(values.reps))
  ) {
    throw new ConvexError('INVALID_SET_VALUE');
  }
  const rpe = effort ? rpeFromEffort(effort.value, effort.scale) : undefined;
  if (rpe !== undefined && !isValidRpe(rpe)) {
    throw new ConvexError('INVALID_EFFORT');
  }
  return {
    ...values,
    ...(type !== undefined && { type }),
    ...(effort !== undefined && { rpe }),
  };
}

export const updateSet = mutation({
  args: { setId: v.id('sets'), ...setChangeArgs },
  handler: async (ctx, { setId, ...changes }) => {
    const userId = await requireIdentityId(ctx);
    const { workout } = await requireOwnedSet(ctx, userId, setId);
    requireActive(workout);
    await ctx.db.patch(setId, setPatch(changes));
  },
});

export const completeSet = mutation({
  args: { setId: v.id('sets'), ...setChangeArgs },
  handler: async (ctx, { setId, ...changes }) => {
    const userId = await requireIdentityId(ctx);
    const { workout } = await requireOwnedSet(ctx, userId, setId);
    requireActive(workout);
    await ctx.db.patch(setId, {
      ...setPatch(changes),
      completedAt: Date.now(),
    });
  },
});

export const uncompleteSet = mutation({
  args: { setId: v.id('sets') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { workout } = await requireOwnedSet(ctx, userId, args.setId);
    requireActive(workout);
    await ctx.db.patch(args.setId, { completedAt: undefined });
  },
});

/**
 * Ends the active Workout. Finish needs every planned Set done; Terminate ends
 * early and keeps logged Sets. A Workout with nothing logged is abandoned.
 */
export const end = mutation({
  args: {
    workoutId: v.id('workouts'),
    reason: v.union(v.literal('finish'), v.literal('terminate')),
  },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const workout = await requireOwnedWorkout(ctx, userId, args.workoutId);
    requireActive(workout);
    const sets = await setsOfWorkout(ctx, workout._id);
    const progress = progressOf(sets);
    if (args.reason === 'finish' && progress.done < progress.total) {
      throw new ConvexError('NOT_ALL_SETS_DONE');
    }

    const completedTimes = sets.flatMap((set) =>
      set.completedAt === undefined ? [] : [set.completedAt]
    );
    if (completedTimes.length === 0) {
      await ctx.db.patch(workout._id, {
        status: 'abandoned',
        finishedAt: Date.now(),
      });
      return 'abandoned' as const;
    }

    await ctx.db.patch(workout._id, {
      status: 'completed',
      finishedAt: Math.max(...completedTimes),
      finishReason:
        args.reason === 'finish' ? 'all_sets_done' : 'terminated_early',
    });
    return 'completed' as const;
  },
});

export const setEndTime = mutation({
  args: { workoutId: v.id('workouts'), finishedAt: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const workout = await requireOwnedWorkout(ctx, userId, args.workoutId);
    if (workout.status !== 'completed') {
      throw new ConvexError('WORKOUT_NOT_COMPLETED');
    }
    if (args.finishedAt < workout.startedAt || args.finishedAt > Date.now()) {
      throw new ConvexError('INVALID_END_TIME');
    }
    await ctx.db.patch(workout._id, { finishedAt: args.finishedAt });
  },
});
