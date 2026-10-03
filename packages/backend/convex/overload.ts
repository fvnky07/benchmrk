import { ConvexError, v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { type MutationCtx, query } from './_generated/server';
import { requireVisibleExercise } from './lib/exercises';
import { requireIdentityId } from './lib/identity';
import {
  applyOverloadTargets,
  isWorkingSet,
  recentExposures,
  replanActiveWorkout,
  retargetPatch,
} from './lib/overload';
import {
  requireActive,
  requireOwnedWorkoutExercise,
  setsOfExercise,
} from './lib/workoutData';
import { workoutMutation } from './lib/workoutMutation';
import { readMemberSettings, saveMemberSettings } from './memberSettings';

const MAX_TARGET_REPS = 100;
const MAX_TARGET_WEIGHT_KG = 1000;

/**
 * The target sheet for an Exercise in a Workout: Last time (the newest
 * exposure), Suggested next (the saved targets) and what Why explains.
 */
export const targetSheet = query({
  args: { workoutExerciseId: v.id('workoutExercises') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { workoutExercise } = await requireOwnedWorkoutExercise(
      ctx,
      userId,
      args.workoutExerciseId
    );
    const exercise = await ctx.db.get(workoutExercise.exerciseId);
    if (!exercise) throw new ConvexError('EXERCISE_NOT_FOUND');
    const settings = await readMemberSettings(ctx, userId);
    const [last] = await recentExposures(ctx, userId, exercise._id);
    const working = (await setsOfExercise(ctx, workoutExercise._id)).filter(
      isWorkingSet
    );
    return {
      exerciseId: exercise._id,
      exerciseName: exercise.name,
      exerciseType: exercise.type,
      repRange: {
        min: workoutExercise.repRangeMin,
        max: workoutExercise.repRangeMax,
      },
      stepKg: workoutExercise.stepKg,
      lastTime: last ? last.sets : null,
      suggested: working.flatMap((set) => (set.target ? [set.target] : [])),
      // Logged targets remain in Suggested next, but cannot seed later edits.
      editingTarget:
        working.find((set) => set.completedAt === undefined)?.target ?? null,
      basis: workoutExercise.overload ?? null,
      targetsOn: settings.overloadTargets,
      exerciseTargetsOn: !settings.targetsOffExerciseIds.includes(exercise._id),
    };
  },
});

async function requireOpenExercise(
  ctx: MutationCtx,
  workoutExerciseId: Doc<'workoutExercises'>['_id']
) {
  const userId = await requireIdentityId(ctx);
  const { workout, workoutExercise } = await requireOwnedWorkoutExercise(
    ctx,
    userId,
    workoutExerciseId
  );
  requireActive(workout);
  const unlogged = (await setsOfExercise(ctx, workoutExercise._id)).filter(
    (set) => isWorkingSet(set) && set.completedAt === undefined
  );
  return { userId, workoutExercise, unlogged };
}

/** The member sets their own target for the rest of this Exercise's Sets. */
export const editTarget = workoutMutation({
  args: {
    workoutExerciseId: v.id('workoutExercises'),
    weightKg: v.union(v.number(), v.null()),
    reps: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId, workoutExercise, unlogged } = await requireOpenExercise(
      ctx,
      args.workoutExerciseId
    );
    const validReps =
      Number.isInteger(args.reps) &&
      args.reps >= 1 &&
      args.reps <= MAX_TARGET_REPS;
    const validWeight =
      args.weightKg === null ||
      (args.weightKg >= 0 && args.weightKg <= MAX_TARGET_WEIGHT_KG);
    if (!validReps || !validWeight) throw new ConvexError('INVALID_TARGET');
    const exercise = await ctx.db.get(workoutExercise.exerciseId);
    if (exercise?.type !== 'strength' && exercise?.type !== 'bodyweight') {
      throw new ConvexError('TARGETS_NOT_SUPPORTED');
    }
    const settings = await readMemberSettings(ctx, userId);
    if (
      !settings.overloadTargets ||
      settings.targetsOffExerciseIds.includes(exercise._id)
    ) {
      throw new ConvexError('TARGETS_OFF');
    }

    const target = { weightKg: args.weightKg, reps: args.reps };
    for (const set of unlogged) {
      await ctx.db.patch(set._id, retargetPatch(set, target));
    }
    await ctx.db.patch(workoutExercise._id, {
      overload: {
        reason: workoutExercise.overload?.reason ?? 'baseline',
        effortNotChecked: workoutExercise.overload?.effortNotChecked ?? false,
        effortBlocked: workoutExercise.overload?.effortBlocked ?? false,
        plateau: workoutExercise.overload?.plateau ?? false,
        repRangeChanged: workoutExercise.overload?.repRangeChanged ?? false,
        edited: true,
        declined: false,
      },
    });
  },
});

/** Clears this Exercise's targets, preserving every already-logged value. */
export const declineTargets = workoutMutation({
  args: { workoutExerciseId: v.id('workoutExercises') },
  handler: async (ctx, args) => {
    const { workoutExercise } = await requireOpenExercise(
      ctx,
      args.workoutExerciseId
    );
    const { overload } = workoutExercise;
    if (!overload) throw new ConvexError('NO_TARGET');
    for (const set of await setsOfExercise(ctx, workoutExercise._id)) {
      await ctx.db.patch(
        set._id,
        set.completedAt === undefined
          ? retargetPatch(set, undefined)
          : { target: undefined, fromTarget: undefined }
      );
    }
    await ctx.db.patch(workoutExercise._id, {
      overload: { ...overload, edited: false, declined: true },
    });
  },
});

/** Back to the suggestion after an edit or a decline. */
export const resetTargets = workoutMutation({
  args: { workoutExerciseId: v.id('workoutExercises') },
  handler: async (ctx, args) => {
    const { workoutExercise } = await requireOpenExercise(
      ctx,
      args.workoutExerciseId
    );
    await applyOverloadTargets(ctx, workoutExercise);
  },
});

/**
 * Switches Overload targets on or off, everywhere or for one Exercise. The
 * active Workout follows at once; switching back on resumes from history.
 */
export const setTargetsEnabled = workoutMutation({
  args: {
    exerciseId: v.optional(v.id('exercises')),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    if (args.exerciseId) {
      await requireVisibleExercise(ctx, userId, args.exerciseId);
      const { targetsOffExerciseIds } = await readMemberSettings(ctx, userId);
      const others = targetsOffExerciseIds.filter(
        (id) => id !== args.exerciseId
      );
      await saveMemberSettings(ctx, userId, {
        targetsOffExerciseIds: args.enabled
          ? others
          : [...others, args.exerciseId],
      });
    } else {
      await saveMemberSettings(ctx, userId, { overloadTargets: args.enabled });
    }
    await replanActiveWorkout(ctx, userId, args.exerciseId);
  },
});

/**
 * Hides the Plateau flag until the Exercise's state changes: it shows again
 * once a newer Workout with the Exercise completes and it still applies.
 */
export const dismissPlateau = workoutMutation({
  args: { workoutExerciseId: v.id('workoutExercises') },
  handler: async (ctx, args) => {
    const { userId, workoutExercise } = await requireOpenExercise(
      ctx,
      args.workoutExerciseId
    );
    const { overload } = workoutExercise;
    if (!overload?.plateau) return;
    const [newest] = await recentExposures(
      ctx,
      userId,
      workoutExercise.exerciseId
    );
    if (newest) {
      await ctx.db.patch(newest.workoutExerciseId, { plateauDismissed: true });
    }
    await ctx.db.patch(workoutExercise._id, {
      overload: { ...overload, plateau: false },
    });
  },
});
