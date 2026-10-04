// Mid-Workout structure changes (remove, reorder, skip, swap) and saving them
// back to the Routine at finish. Changes apply to this Workout only until the
// member saves; saving applies exactly the plan the finish screen showed.
import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from './_generated/server';
import { defaultStepKg } from './domain/units';
import { requireVisibleExercise } from './lib/exercises';
import { getIdentityId, requireIdentityId } from './lib/identity';
import { applyOverloadTargets } from './lib/overload';
import {
  requireActive,
  requireOwnedWorkout,
  requireOwnedWorkoutExercise,
  setsOfExercise,
  workoutExercisesOf,
} from './lib/workoutData';
import { workoutMutation } from './lib/workoutMutation';
import { readMemberSettings } from './memberSettings';
import { routineExercisesOf } from './routines';

async function requireNothingLogged(
  ctx: QueryCtx,
  workoutExerciseId: Id<'workoutExercises'>
) {
  const sets = await setsOfExercise(ctx, workoutExerciseId);
  if (sets.some((set) => set.completedAt !== undefined)) {
    throw new ConvexError('EXERCISE_HAS_LOGGED_SETS');
  }
  return sets;
}

async function writeOrder(
  ctx: MutationCtx,
  workoutExercises: Doc<'workoutExercises'>[]
) {
  for (const [order, workoutExercise] of workoutExercises.entries()) {
    if (workoutExercise.order !== order) {
      await ctx.db.patch(workoutExercise._id, { order });
    }
  }
}

/** Removes an Exercise with nothing logged from this Workout. */
export const removeExercise = workoutMutation({
  args: { workoutExerciseId: v.id('workoutExercises') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { workout, workoutExercise } = await requireOwnedWorkoutExercise(
      ctx,
      userId,
      args.workoutExerciseId
    );
    requireActive(workout);
    for (const set of await requireNothingLogged(ctx, workoutExercise._id)) {
      await ctx.db.delete(set._id);
    }
    await ctx.db.delete(workoutExercise._id);
    await writeOrder(
      ctx,
      (await workoutExercisesOf(ctx, workout._id)).filter(
        (item) => item._id !== workoutExercise._id
      )
    );
  },
});

/** Moves an Exercise to `toIndex` in this Workout's order. */
export const moveExercise = workoutMutation({
  args: { workoutExerciseId: v.id('workoutExercises'), toIndex: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { workout, workoutExercise } = await requireOwnedWorkoutExercise(
      ctx,
      userId,
      args.workoutExerciseId
    );
    requireActive(workout);
    const others = (await workoutExercisesOf(ctx, workout._id)).filter(
      (item) => item._id !== workoutExercise._id
    );
    const toIndex = Math.max(
      0,
      Math.min(Math.trunc(args.toIndex), others.length)
    );
    await writeOrder(ctx, [
      ...others.slice(0, toIndex),
      workoutExercise,
      ...others.slice(toIndex),
    ]);
  },
});

/** Skips (or unskips) an Exercise for this Workout; logged Sets stay. */
export const setSkipped = workoutMutation({
  args: { workoutExerciseId: v.id('workoutExercises'), skipped: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { workout, workoutExercise } = await requireOwnedWorkoutExercise(
      ctx,
      userId,
      args.workoutExerciseId
    );
    requireActive(workout);
    await ctx.db.patch(workoutExercise._id, {
      skipped: args.skipped || undefined,
    });
  },
});

/**
 * Swaps an Exercise with nothing logged for another. Its Sets stay, cleared of
 * the old Exercise's values, and get the new Exercise's Overload targets.
 */
export const swapExercise = workoutMutation({
  args: {
    workoutExerciseId: v.id('workoutExercises'),
    exerciseId: v.id('exercises'),
  },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { workout, workoutExercise } = await requireOwnedWorkoutExercise(
      ctx,
      userId,
      args.workoutExerciseId
    );
    requireActive(workout);
    const sets = await requireNothingLogged(ctx, workoutExercise._id);
    const exercise = await requireVisibleExercise(ctx, userId, args.exerciseId);
    const { units } = await readMemberSettings(ctx, userId);

    await ctx.db.patch(workoutExercise._id, {
      exerciseId: exercise._id,
      stepKg: defaultStepKg(exercise.equipment, units),
    });
    for (const set of sets) {
      await ctx.db.patch(set._id, {
        exerciseId: exercise._id,
        weightKg: undefined,
        reps: undefined,
        durationSeconds: undefined,
        distanceMeters: undefined,
        target: undefined,
        fromTarget: undefined,
      });
    }
    const swapped = await ctx.db.get(workoutExercise._id);
    if (swapped) await applyOverloadTargets(ctx, swapped);
  },
});

type Shape = { name: string; sets: number; restSeconds: number | null };

type StructureChange =
  | { kind: 'added'; exercise: string }
  | { kind: 'removed'; exercise: string }
  | { kind: 'swapped'; from: string; to: string }
  | { kind: 'sets'; exercise: string; from: number; to: number }
  | {
      kind: 'rest';
      exercise: string;
      from: number | null;
      to: number | null;
    }
  | { kind: 'order' };

/** One entry of the Routine as it would be after saving. */
type PlannedEntry = {
  shape: Shape;
  workoutExercise: Doc<'workoutExercises'>;
  routineExercise: Doc<'routineExercises'> | null;
};

/**
 * Compares the Workout with its Routine. Skipped Exercises keep their Routine
 * values; zero-Set Exercises are omitted from both the diff and saved plan.
 */
async function structurePlan(ctx: QueryCtx, workout: Doc<'workouts'>) {
  const routine = workout.routineId
    ? await ctx.db.get(workout.routineId)
    : null;
  if (!routine || routine.userId !== workout.userId) return null;
  const routineExercises = await routineExercisesOf(ctx, routine._id);
  const nameOf = async (exerciseId: Id<'exercises'>) =>
    (await ctx.db.get(exerciseId))?.name ?? 'Exercise';

  const changes: StructureChange[] = [];
  const planned: PlannedEntry[] = [];
  for (const workoutExercise of await workoutExercisesOf(ctx, workout._id)) {
    const routineExercise =
      routineExercises.find(
        (item) => item._id === workoutExercise.routineExerciseId
      ) ?? null;
    if (workoutExercise.skipped) {
      if (routineExercise) {
        planned.push({
          workoutExercise,
          routineExercise,
          shape: {
            name: await nameOf(routineExercise.exerciseId),
            sets: routineExercise.targetSets,
            restSeconds: routineExercise.plannedRestSeconds ?? null,
          },
        });
      }
      continue;
    }

    const name = await nameOf(workoutExercise.exerciseId);
    const shape: Shape = {
      name,
      sets: (await setsOfExercise(ctx, workoutExercise._id)).filter(
        (set) => set.type !== 'warmup'
      ).length,
      restSeconds: workoutExercise.plannedRestSeconds ?? null,
    };
    if (shape.sets === 0) continue;
    planned.push({ workoutExercise, routineExercise, shape });

    if (!routineExercise) {
      changes.push({ kind: 'added', exercise: name });
      continue;
    }
    if (routineExercise.exerciseId !== workoutExercise.exerciseId) {
      changes.push({
        kind: 'swapped',
        from: await nameOf(routineExercise.exerciseId),
        to: name,
      });
    }
    if (routineExercise.targetSets !== shape.sets) {
      changes.push({
        kind: 'sets',
        exercise: name,
        from: routineExercise.targetSets,
        to: shape.sets,
      });
    }
    if ((routineExercise.plannedRestSeconds ?? null) !== shape.restSeconds) {
      changes.push({
        kind: 'rest',
        exercise: name,
        from: routineExercise.plannedRestSeconds ?? null,
        to: shape.restSeconds,
      });
    }
  }

  const kept = new Set(
    planned.flatMap((entry) =>
      entry.routineExercise ? [entry.routineExercise._id] : []
    )
  );
  const removed = routineExercises.filter((item) => !kept.has(item._id));
  for (const routineExercise of removed) {
    changes.push({
      kind: 'removed',
      exercise: await nameOf(routineExercise.exerciseId),
    });
  }
  const keptOrder = planned.flatMap((entry) =>
    entry.routineExercise ? [entry.routineExercise._id] : []
  );
  const routineOrder = routineExercises
    .map((item) => item._id)
    .filter((id) => kept.has(id));
  if (keptOrder.some((id, index) => id !== routineOrder[index])) {
    changes.push({ kind: 'order' });
  }

  const before: Shape[] = [];
  for (const routineExercise of routineExercises) {
    before.push({
      name: await nameOf(routineExercise.exerciseId),
      sets: routineExercise.targetSets,
      restSeconds: routineExercise.plannedRestSeconds ?? null,
    });
  }

  return { routine, planned, removed, before, changes };
}

/** The before/after view for "Save changes to Routine"; null without a Routine. */
export const getChanges = query({
  args: { workoutId: v.id('workouts') },
  handler: async (ctx, args) => {
    const userId = await getIdentityId(ctx);
    if (!userId) return null;
    const workout = await ctx.db.get(args.workoutId);
    if (!workout || workout.userId !== userId) return null;
    const plan = await structurePlan(ctx, workout);
    if (!plan) return null;
    return {
      routineName: plan.routine.name,
      before: plan.before,
      after: plan.planned.map((entry) => entry.shape),
      changes: plan.changes,
    };
  },
});

/** Updates the Routine to the "after" view of a finished Workout. */
export const saveToRoutine = mutation({
  args: { workoutId: v.id('workouts') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const workout = await requireOwnedWorkout(ctx, userId, args.workoutId);
    if (workout.status !== 'completed') {
      throw new ConvexError('WORKOUT_NOT_COMPLETED');
    }
    const plan = await structurePlan(ctx, workout);
    if (!plan) throw new ConvexError('ROUTINE_NOT_FOUND');

    for (const routineExercise of plan.removed) {
      await ctx.db.delete(routineExercise._id);
    }
    for (const [order, entry] of plan.planned.entries()) {
      const { workoutExercise, routineExercise, shape } = entry;
      if (!routineExercise) {
        const routineExerciseId = await ctx.db.insert('routineExercises', {
          routineId: plan.routine._id,
          exerciseId: workoutExercise.exerciseId,
          order,
          targetSets: shape.sets,
          repRangeMin: workoutExercise.repRangeMin,
          repRangeMax: workoutExercise.repRangeMax,
          setRepTargets: [],
          stepKg: workoutExercise.stepKg,
          plannedRestSeconds: shape.restSeconds ?? undefined,
        });
        await ctx.db.patch(workoutExercise._id, { routineExerciseId });
        continue;
      }
      const swapped = routineExercise.exerciseId !== workoutExercise.exerciseId;
      await ctx.db.patch(routineExercise._id, {
        order,
        targetSets: shape.sets,
        setRepTargets: routineExercise.setRepTargets.slice(0, shape.sets),
        plannedRestSeconds: shape.restSeconds ?? undefined,
        ...(swapped && {
          exerciseId: workoutExercise.exerciseId,
          stepKg: workoutExercise.stepKg,
        }),
      });
    }
    await ctx.db.patch(plan.routine._id, {
      exerciseCount: plan.planned.length,
      updatedAt: Date.now(),
    });
  },
});
