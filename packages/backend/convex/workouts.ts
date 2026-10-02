import { ConvexError, type ObjectType, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from './_generated/server';
import { isValidRpe, rpeFromEffort } from './domain/effort';
import { meetsTarget } from './domain/overload';
import {
  afterSet,
  blockMembers,
  skipForNow as skipInRound,
  uncheckRound,
} from './domain/rounds';
import { LOGGED_TOGETHER_MS } from './domain/time';
import { defaultStepKg } from './domain/units';
import { requireVisibleExercise } from './lib/exercises';
import { leaveGroup } from './lib/groupProgress';
import { getIdentityId, requireIdentityId } from './lib/identity';
import { applyOverloadTargets } from './lib/overload';
import { roundExercisesOf, saveRound, settleBlock } from './lib/rounds';
import {
  findActiveWorkout,
  progressOf,
  requireActive,
  requireOwnedSet,
  requireOwnedWorkout,
  requireOwnedWorkoutExercise,
  restEndsAt,
  setsOfExercise,
  setsOfWorkout,
  workoutExercisesOf,
} from './lib/workoutData';
import { workoutMutation } from './lib/workoutMutation';
import { workoutView } from './lib/workoutView';
import { readMemberSettings } from './memberSettings';
import { deleteSetNote } from './notes';
import { routineExercisesOf } from './routines';
import { memberSettingsFields, setTypeValidator } from './schema';

const DEFAULT_SETS_FOR_ADDED_EXERCISE = 3;
const DEFAULT_REP_RANGE = { min: 6, max: 10 };

/**
 * Plans an Exercise that just entered a Workout: its planned Sets, then the
 * Overload targets saved on them.
 */
async function planExercise(
  ctx: MutationCtx,
  workout: Doc<'workouts'>,
  workoutExerciseId: Id<'workoutExercises'>,
  count: number
) {
  const workoutExercise = await ctx.db.get(workoutExerciseId);
  if (!workoutExercise) throw new ConvexError('WORKOUT_NOT_FOUND');
  for (let order = 0; order < count; order += 1) {
    await ctx.db.insert('sets', {
      userId: workout.userId,
      workoutId: workout._id,
      workoutExerciseId,
      exerciseId: workoutExercise.exerciseId,
      order,
      type: 'normal',
    });
  }
  await applyOverloadTargets(ctx, workoutExercise);
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
export const start = workoutMutation({
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
    const blocks = new Map<Id<'routineBlocks'>, Id<'workoutBlocks'>>();
    const workoutBlockFor = async (routineBlockId: Id<'routineBlocks'>) => {
      const copied = blocks.get(routineBlockId);
      if (copied) return copied;
      const routineBlock = await ctx.db.get(routineBlockId);
      const blockId = await ctx.db.insert('workoutBlocks', {
        workoutId,
        routineBlockId,
        plannedRestSeconds: routineBlock?.plannedRestSeconds,
        completedRounds: [],
      });
      blocks.set(routineBlockId, blockId);
      return blockId;
    };
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
        blockId: routineExercise.blockId
          ? await workoutBlockFor(routineExercise.blockId)
          : undefined,
      });
      await planExercise(
        ctx,
        workout,
        workoutExerciseId,
        routineExercise.targetSets
      );
    }
    return workoutId;
  },
});

export const addExercise = workoutMutation({
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
    await planExercise(
      ctx,
      workout,
      workoutExerciseId,
      DEFAULT_SETS_FOR_ADDED_EXERCISE
    );
    return workoutExerciseId;
  },
});

/** Inserts a Set before `sets[index]` (or last), shifting the later Sets down. */
async function insertSetAt(
  ctx: MutationCtx,
  sets: Doc<'sets'>[],
  index: number,
  set: Omit<Doc<'sets'>, '_id' | '_creationTime' | 'order'>
) {
  const at = sets[index];
  const order = at ? at.order : (sets.at(-1)?.order ?? -1) + 1;
  for (const later of sets.slice(index)) {
    await ctx.db.patch(later._id, { order: later.order + 1 });
  }
  return ctx.db.insert('sets', { ...set, order });
}

/** Adds a Set: Working Sets go last, Warm-up Sets before the first Working Set. */
export const addSet = workoutMutation({
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
    const type = args.type ?? 'normal';
    const firstWorking = sets.findIndex((set) => set.type !== 'warmup');
    await insertSetAt(
      ctx,
      sets,
      type === 'warmup' && firstWorking !== -1 ? firstWorking : sets.length,
      {
        userId: workout.userId,
        workoutId: workout._id,
        workoutExerciseId: workoutExercise._id,
        exerciseId: workoutExercise.exerciseId,
        type,
      }
    );
  },
});

/** Adds an unlogged copy of a Set (type and values, not effort) right after it. */
export const duplicateSet = workoutMutation({
  args: { setId: v.id('sets') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { set, workout } = await requireOwnedSet(ctx, userId, args.setId);
    requireActive(workout);
    const sets = await setsOfExercise(ctx, set.workoutExerciseId);
    const index = sets.findIndex((item) => item._id === set._id);
    return insertSetAt(ctx, sets, index + 1, {
      userId: set.userId,
      workoutId: set.workoutId,
      workoutExerciseId: set.workoutExerciseId,
      exerciseId: set.exerciseId,
      type: set.type,
      weightKg: set.weightKg,
      reps: set.reps,
      durationSeconds: set.durationSeconds,
      distanceMeters: set.distanceMeters,
    });
  },
});

/** Deletes a Set that hasn't been logged; logged Sets are history. */
export const deleteSet = workoutMutation({
  args: { setId: v.id('sets') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { set, workout } = await requireOwnedSet(ctx, userId, args.setId);
    requireActive(workout);
    if (set.completedAt !== undefined) throw new ConvexError('SET_LOGGED');
    await ctx.db.delete(set._id);
    await deleteSetNote(ctx, set._id);
    const workoutExercise = await ctx.db.get(set.workoutExerciseId);
    await settleBlock(ctx, workout._id, workoutExercise?.blockId);
  },
});

const setChangeArgs = {
  /** Null explicitly clears an edited field; omitted fields stay untouched. */
  weightKg: v.optional(v.union(v.number(), v.null())),
  reps: v.optional(v.union(v.number(), v.null())),
  durationSeconds: v.optional(v.union(v.number(), v.null())),
  distanceMeters: v.optional(v.union(v.number(), v.null())),
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
      (value) => value != null && !(Number.isFinite(value) && value >= 0)
    ) ||
    (values.reps != null && !Number.isInteger(values.reps))
  ) {
    throw new ConvexError('INVALID_SET_VALUE');
  }
  const rpe = effort ? rpeFromEffort(effort.value, effort.scale) : undefined;
  if (rpe !== undefined && !isValidRpe(rpe)) {
    throw new ConvexError('INVALID_EFFORT');
  }
  const patch: Partial<Doc<'sets'>> = {};
  if ('weightKg' in values) patch.weightKg = values.weightKg ?? undefined;
  if ('reps' in values) patch.reps = values.reps ?? undefined;
  if ('durationSeconds' in values) {
    patch.durationSeconds = values.durationSeconds ?? undefined;
  }
  if ('distanceMeters' in values) {
    patch.distanceMeters = values.distanceMeters ?? undefined;
  }
  return {
    ...patch,
    ...(type !== undefined && { type }),
    ...(effort !== undefined && { rpe }),
  };
}

/**
 * Which values came from the target after a change: a field the member sets
 * is theirs; an untouched one keeps what it had.
 */
function provenanceAfter(
  set: Doc<'sets'>,
  patch: Partial<Doc<'sets'>>
): Doc<'sets'>['fromTarget'] {
  if (!set.target) return undefined;
  return {
    weight: !('weightKg' in patch) && set.fromTarget?.weight === true,
    reps: !('reps' in patch) && set.fromTarget?.reps === true,
  };
}

/** The first edit of an unlogged Set starts its working time. */
function firstTouch(set: Doc<'sets'>): Partial<Doc<'sets'>> {
  return set.firstTouchedAt === undefined && set.completedAt === undefined
    ? { firstTouchedAt: Date.now() }
    : {};
}

export const updateSet = workoutMutation({
  args: { setId: v.id('sets'), ...setChangeArgs },
  handler: async (ctx, { setId, ...changes }) => {
    const userId = await requireIdentityId(ctx);
    const { set, workout } = await requireOwnedSet(ctx, userId, setId);
    requireActive(workout);
    const patch = setPatch(changes);
    await ctx.db.patch(setId, {
      ...patch,
      ...firstTouch(set),
      fromTarget: provenanceAfter(set, patch),
    });
  },
});

/** The member started editing a Set (its first keypad press). */
export const touchSet = mutation({
  args: { setId: v.id('sets') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { set, workout } = await requireOwnedSet(ctx, userId, args.setId);
    requireActive(workout);
    const touched = firstTouch(set);
    if (touched.firstTouchedAt) await ctx.db.patch(set._id, touched);
  },
});

/**
 * A Set's Overload target while it is a Working Set. A planned Set turned into
 * a Warm-up or Dropset keeps its target for if it turns back.
 */
function workingTarget(set: Doc<'sets'>) {
  return set.type === 'normal' || set.type === 'failure'
    ? set.target
    : undefined;
}

/** The target's values for a Set's empty fields, marked as from the target. */
function targetFill(
  set: Doc<'sets'>,
  changes: ObjectType<typeof setChangeArgs> = {}
): Partial<Doc<'sets'>> {
  const target = workingTarget(set);
  if (!target || set.completedAt !== undefined) return {};
  const weightKg =
    changes.weightKg !== null &&
    set.weightKg === undefined &&
    target.weightKg !== null
      ? target.weightKg
      : undefined;
  const reps =
    changes.reps !== null && set.reps === undefined ? target.reps : undefined;
  return {
    ...(weightKg !== undefined && { weightKg }),
    ...(reps !== undefined && { reps }),
    fromTarget: {
      weight: weightKg !== undefined || set.fromTarget?.weight === true,
      reps: reps !== undefined || set.fromTarget?.reps === true,
    },
  };
}

/**
 * Logs a Set. Fields the member never touched log the Overload target. The
 * result says whether the target was met (for the target-met haptic), which
 * Exercise comes next and which Alternating sets round this Set completed.
 */
export const completeSet = workoutMutation({
  args: { setId: v.id('sets'), ...setChangeArgs },
  returns: v.object({
    targetMet: v.boolean(),
    next: v.union(v.id('workoutExercises'), v.null()),
    roundCompleted: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, { setId, ...changes }) => {
    const userId = await requireIdentityId(ctx);
    const { set, workout } = await requireOwnedSet(ctx, userId, setId);
    requireActive(workout);
    const now = Date.now();
    const patch = setPatch(changes);
    const edited = {
      ...set,
      ...patch,
      fromTarget: provenanceAfter(set, patch),
    };
    const fill = targetFill(edited, changes);
    const logged = { ...edited, ...fill };
    await ctx.db.patch(setId, {
      ...patch,
      ...fill,
      fromTarget: logged.fromTarget,
      completedAt: now,
    });
    const { next, completedRound } = await afterLogging(
      ctx,
      workout,
      logged,
      now
    );
    const target = workingTarget(logged);
    return {
      targetMet: target !== undefined && meetsTarget(logged, target),
      next,
      roundCompleted: completedRound?.number ?? null,
    };
  },
});

/** Tapping a faded field: the Set takes its target's values. */
export const fillFromTarget = workoutMutation({
  args: { setId: v.id('sets') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { set, workout } = await requireOwnedSet(ctx, userId, args.setId);
    requireActive(workout);
    await ctx.db.patch(set._id, { ...targetFill(set), ...firstTouch(set) });
  },
});

/** The wand: every empty Set of the Exercise takes its target's values. */
export const fillFromTargets = workoutMutation({
  args: { workoutExerciseId: v.id('workoutExercises') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { workout, workoutExercise } = await requireOwnedWorkoutExercise(
      ctx,
      userId,
      args.workoutExerciseId
    );
    requireActive(workout);
    for (const set of await setsOfExercise(ctx, workoutExercise._id)) {
      if (set.weightKg === undefined && set.reps === undefined) {
        await ctx.db.patch(set._id, targetFill(set));
      }
    }
  },
});

/**
 * Runs the round engine after a Set is logged: credits the round, starts the
 * planned rest (the block's after a round, the Exercise's after a standalone
 * Set; none within a round or after the final planned Set) and picks what's
 * next. Logging a Set always ends the rest before it.
 */
async function afterLogging(
  ctx: MutationCtx,
  workout: Doc<'workouts'>,
  set: Doc<'sets'>,
  now: number
) {
  const settings = await readMemberSettings(ctx, workout.userId);
  const workoutExercise = await ctx.db.get(set.workoutExerciseId);
  const block = workoutExercise?.blockId
    ? await ctx.db.get(workoutExercise.blockId)
    : null;
  const exercises = await roundExercisesOf(ctx, workout._id);
  const result = afterSet({
    exercises,
    completedId: set.workoutExerciseId,
    open: block?.round ?? null,
    completedRounds: block?.completedRounds ?? [],
    warmup: set.type === 'warmup',
    autoAdvance: settings.autoAdvance,
  });
  if (block && blockMembers(exercises, block._id).length > 0) {
    await saveRound(ctx, block, result, now);
  }
  const plannedSeconds =
    result.rest === 'block'
      ? (block?.plannedRestSeconds ?? settings.defaultRestSeconds)
      : result.rest === 'exercise'
        ? (workoutExercise?.plannedRestSeconds ?? settings.defaultRestSeconds)
        : 0;
  const resting = plannedSeconds > 0;
  await ctx.db.patch(workout._id, {
    rest: resting
      ? {
          startedAt: now,
          plannedSeconds,
          adjustedSeconds: 0,
          afterSetId: set._id,
        }
      : undefined,
  });
  if (resting) {
    await ctx.db.patch(set._id, {
      restAfter: { plannedSeconds, endsAt: now + plannedSeconds * 1000 },
    });
  }

  await reconcileLoggedTogether(ctx, workout._id);
  return result;
}

/** Together flags follow current completion times, including after an uncheck. */
async function reconcileLoggedTogether(
  ctx: MutationCtx,
  workoutId: Id<'workouts'>
) {
  const sets = await setsOfWorkout(ctx, workoutId);
  const logged = sets
    .filter((set) => set.completedAt !== undefined)
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));
  const together = new Set<Id<'sets'>>();
  for (let index = 1; index < logged.length; index += 1) {
    const previous = logged[index - 1];
    const current = logged[index];
    if (
      previous?.completedAt !== undefined &&
      current?.completedAt !== undefined &&
      current.completedAt - previous.completedAt <= LOGGED_TOGETHER_MS
    ) {
      together.add(previous._id);
      together.add(current._id);
    }
  }
  for (const set of sets) {
    const loggedTogether = together.has(set._id);
    if ((set.loggedTogether ?? false) !== loggedTogether) {
      await ctx.db.patch(set._id, {
        loggedTogether: loggedTogether || undefined,
      });
    }
  }
}

/** Keeps the Set's rest record in step with the running rest. */
async function recordRest(
  ctx: MutationCtx,
  rest: NonNullable<Doc<'workouts'>['rest']>,
  endsAt: number
) {
  if (!rest.afterSetId) return;
  await ctx.db.patch(rest.afterSetId, {
    restAfter: {
      plannedSeconds: rest.plannedSeconds + rest.adjustedSeconds,
      endsAt,
    },
  });
}

/**
 * Unchecking a Set reverts its completion and its round credit. Rest that
 * already started stays.
 */
export const uncompleteSet = workoutMutation({
  args: { setId: v.id('sets') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { set, workout } = await requireOwnedSet(ctx, userId, args.setId);
    requireActive(workout);
    await ctx.db.patch(set._id, { completedAt: undefined });
    await reconcileLoggedTogether(ctx, workout._id);
    if (set.type === 'warmup') return;
    const workoutExercise = await ctx.db.get(set.workoutExerciseId);
    const block = workoutExercise?.blockId
      ? await ctx.db.get(workoutExercise.blockId)
      : null;
    if (!block) return;
    const { round, completedRounds } = uncheckRound(
      block.round ?? null,
      block.completedRounds,
      blockMembers(await roundExercisesOf(ctx, workout._id), block._id)
    );
    await ctx.db.patch(block._id, {
      round: round ?? undefined,
      completedRounds,
    });
  },
});

/**
 * Skip for now: defers an Exercise without logging. In Alternating sets the
 * round stays open and the next pending Exercise comes up; on its own, the
 * next Exercise with Sets left does.
 */
export const skipForNow = workoutMutation({
  args: { workoutExerciseId: v.id('workoutExercises') },
  returns: v.object({ next: v.id('workoutExercises') }),
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { workout, workoutExercise } = await requireOwnedWorkoutExercise(
      ctx,
      userId,
      args.workoutExerciseId
    );
    requireActive(workout);
    const block = workoutExercise.blockId
      ? await ctx.db.get(workoutExercise.blockId)
      : null;
    const result = skipInRound({
      exercises: await roundExercisesOf(ctx, workout._id),
      skippedId: workoutExercise._id,
      open: block?.round ?? null,
      completedRounds: block?.completedRounds ?? [],
    });
    if (!result) throw new ConvexError('NOTHING_ELSE_TO_DO');
    if (block && result.round) {
      await ctx.db.patch(block._id, { round: result.round });
    }
    return { next: result.next };
  },
});

async function requireResting(
  ctx: QueryCtx,
  userId: string,
  workoutId: Id<'workouts'>
) {
  const workout = await requireOwnedWorkout(ctx, userId, workoutId);
  requireActive(workout);
  if (!workout.rest) throw new ConvexError('NOT_RESTING');
  return { workout, rest: workout.rest };
}

/** Adds or removes rest time; the end never moves before now. */
export const adjustRest = workoutMutation({
  args: { workoutId: v.id('workouts'), seconds: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { workout, rest } = await requireResting(ctx, userId, args.workoutId);
    if (!Number.isInteger(args.seconds)) {
      throw new ConvexError('INVALID_REST_ADJUSTMENT');
    }
    const endsAt = Math.max(restEndsAt(rest) + args.seconds * 1000, Date.now());
    const adjusted = {
      ...rest,
      adjustedSeconds: (endsAt - rest.startedAt) / 1000 - rest.plannedSeconds,
    };
    await ctx.db.patch(workout._id, { rest: adjusted });
    await recordRest(ctx, adjusted, endsAt);
  },
});

export const skipRest = workoutMutation({
  args: { workoutId: v.id('workouts') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { workout, rest } = await requireResting(ctx, userId, args.workoutId);
    await ctx.db.patch(workout._id, { rest: undefined });
    await recordRest(ctx, rest, Math.min(restEndsAt(rest), Date.now()));
  },
});

/** Restarts the planned rest from now, dropping adjustments. */
export const resetRest = workoutMutation({
  args: { workoutId: v.id('workouts') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { workout, rest } = await requireResting(ctx, userId, args.workoutId);
    const restarted = { ...rest, startedAt: Date.now(), adjustedSeconds: 0 };
    await ctx.db.patch(workout._id, { rest: restarted });
    await recordRest(ctx, restarted, restEndsAt(restarted));
  },
});

/**
 * Sets this Workout's default rest for an Exercise, or for its block when it
 * is in Alternating sets (rest comes after each round). It's a structure
 * change: the Routine keeps its value unless the member saves at finish.
 */
export const setExerciseRest = mutation({
  args: {
    workoutExerciseId: v.id('workoutExercises'),
    seconds: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { workout, workoutExercise } = await requireOwnedWorkoutExercise(
      ctx,
      userId,
      args.workoutExerciseId
    );
    requireActive(workout);
    if (!Number.isInteger(args.seconds) || args.seconds < 0) {
      throw new ConvexError('INVALID_REST');
    }
    if (workoutExercise.blockId) {
      await ctx.db.patch(workoutExercise.blockId, {
        plannedRestSeconds: args.seconds,
      });
      return;
    }
    await ctx.db.patch(workoutExercise._id, {
      plannedRestSeconds: args.seconds,
    });
  },
});

/**
 * Ends the active Workout. Finish needs every planned Set done; Terminate ends
 * early and keeps logged Sets. A Workout with nothing logged is abandoned.
 * Unresolved Alternating sets rounds stay incomplete: no Set or rest is
 * invented. Either way the member leaves their Group: membership ends with the
 * Workout, but the Group itself can continue with its remaining members.
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
    const progress = await progressOf(ctx, workout._id);
    if (args.reason === 'finish' && progress.done < progress.total) {
      throw new ConvexError('NOT_ALL_SETS_DONE');
    }
    await leaveGroup(ctx, userId);
    const blocks = await ctx.db
      .query('workoutBlocks')
      .withIndex('by_workout', (q) => q.eq('workoutId', workout._id))
      .collect();
    for (const block of blocks) {
      if (block.round) await ctx.db.patch(block._id, { round: undefined });
    }

    const completedTimes = sets.flatMap((set) =>
      set.completedAt === undefined ? [] : [set.completedAt]
    );
    if (completedTimes.length === 0) {
      await ctx.db.patch(workout._id, {
        status: 'abandoned',
        finishedAt: Date.now(),
        rest: undefined,
      });
      return 'abandoned' as const;
    }

    await ctx.db.patch(workout._id, {
      status: 'completed',
      finishedAt: Math.max(...completedTimes),
      rest: undefined,
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
