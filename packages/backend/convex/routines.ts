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
import { readMemberSettings } from './memberSettings';

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_REP_RANGE = { min: 6, max: 10 };

async function requireOwnedRoutine(
  ctx: QueryCtx,
  userId: string,
  routineId: Id<'routines'>
): Promise<Doc<'routines'>> {
  const routine = await ctx.db.get(routineId);
  if (!routine || routine.userId !== userId) {
    throw new ConvexError('ROUTINE_NOT_FOUND');
  }
  return routine;
}

async function requireOwnedRoutineExercise(
  ctx: QueryCtx,
  userId: string,
  routineExerciseId: Id<'routineExercises'>
) {
  const routineExercise = await ctx.db.get(routineExerciseId);
  if (!routineExercise) throw new ConvexError('ROUTINE_NOT_FOUND');
  const routine = await requireOwnedRoutine(
    ctx,
    userId,
    routineExercise.routineId
  );
  return { routine, routineExercise };
}

/** A Routine's Exercises in their planned order. */
export async function routineExercisesOf(
  ctx: QueryCtx,
  routineId: Id<'routines'>
): Promise<Doc<'routineExercises'>[]> {
  return ctx.db
    .query('routineExercises')
    .withIndex('by_routine', (q) => q.eq('routineId', routineId))
    .collect();
}

async function renumber(ctx: MutationCtx, ordered: Doc<'routineExercises'>[]) {
  await Promise.all(
    ordered.map((routineExercise, order) =>
      routineExercise.order === order
        ? null
        : ctx.db.patch(routineExercise._id, { order })
    )
  );
}

async function touch(ctx: MutationCtx, routineId: Id<'routines'>) {
  await ctx.db.patch(routineId, { updatedAt: Date.now() });
}

function requireName(name: string, code: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new ConvexError(code);
  return trimmed;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getIdentityId(ctx);
    if (!userId) return [];
    const routines = await ctx.db
      .query('routines')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    return routines
      .map((routine) => ({
        _id: routine._id,
        name: routine.name,
        exerciseCount: routine.exerciseCount,
        updatedAt: routine.updatedAt,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = query({
  args: { routineId: v.id('routines') },
  handler: async (ctx, args) => {
    const userId = await getIdentityId(ctx);
    if (!userId) return null;
    const routine = await ctx.db.get(args.routineId);
    if (!routine || routine.userId !== userId) return null;

    const { defaultRestSeconds } = await readMemberSettings(ctx, userId);
    const exercises = await Promise.all(
      (await routineExercisesOf(ctx, routine._id)).map(
        async (routineExercise) => {
          const exercise = await ctx.db.get(routineExercise.exerciseId);
          if (!exercise) throw new ConvexError('EXERCISE_NOT_FOUND');
          return {
            _id: routineExercise._id,
            exerciseId: exercise._id,
            name: exercise.name,
            slug: exercise.slug,
            type: exercise.type,
            equipment: exercise.equipment,
            targetSets: routineExercise.targetSets,
            repRangeMin: routineExercise.repRangeMin,
            repRangeMax: routineExercise.repRangeMax,
            setRepTargets: routineExercise.setRepTargets,
            startingWeightKg: routineExercise.startingWeightKg ?? null,
            stepKg: routineExercise.stepKg,
            plannedRestSeconds: routineExercise.plannedRestSeconds ?? null,
            restSeconds:
              routineExercise.plannedRestSeconds ?? defaultRestSeconds,
          };
        }
      )
    );

    return {
      _id: routine._id,
      name: routine.name,
      targetDurationSeconds: routine.targetDurationSeconds ?? null,
      exercises,
    };
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    return ctx.db.insert('routines', {
      userId,
      name: requireName(args.name, 'EMPTY_ROUTINE_NAME'),
      exerciseCount: 0,
      updatedAt: Date.now(),
    });
  },
});

export const rename = mutation({
  args: { routineId: v.id('routines'), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    await requireOwnedRoutine(ctx, userId, args.routineId);
    await ctx.db.patch(args.routineId, {
      name: requireName(args.name, 'EMPTY_ROUTINE_NAME'),
      updatedAt: Date.now(),
    });
  },
});

export const setTargetDuration = mutation({
  args: {
    routineId: v.id('routines'),
    targetDurationSeconds: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    await requireOwnedRoutine(ctx, userId, args.routineId);
    if (
      args.targetDurationSeconds !== null &&
      !(args.targetDurationSeconds > 0)
    ) {
      throw new ConvexError('INVALID_TARGET_DURATION');
    }
    await ctx.db.patch(args.routineId, {
      targetDurationSeconds: args.targetDurationSeconds ?? undefined,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { routineId: v.id('routines') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    await requireOwnedRoutine(ctx, userId, args.routineId);
    for (const routineExercise of await routineExercisesOf(
      ctx,
      args.routineId
    )) {
      await ctx.db.delete(routineExercise._id);
    }
    await ctx.db.delete(args.routineId);
  },
});

export const addExercise = mutation({
  args: { routineId: v.id('routines'), exerciseId: v.id('exercises') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const routine = await requireOwnedRoutine(ctx, userId, args.routineId);
    const exercise = await requireVisibleExercise(ctx, userId, args.exerciseId);
    const { units } = await readMemberSettings(ctx, userId);
    const order = routine.exerciseCount;

    const routineExerciseId = await ctx.db.insert('routineExercises', {
      routineId: args.routineId,
      exerciseId: exercise._id,
      order,
      targetSets: DEFAULT_TARGET_SETS,
      repRangeMin: DEFAULT_REP_RANGE.min,
      repRangeMax: DEFAULT_REP_RANGE.max,
      setRepTargets: [],
      stepKg: defaultStepKg(exercise.equipment, units),
    });
    await ctx.db.patch(routine._id, {
      exerciseCount: routine.exerciseCount + 1,
      updatedAt: Date.now(),
    });
    return routineExerciseId;
  },
});

export const updateExercise = mutation({
  args: {
    routineExerciseId: v.id('routineExercises'),
    targetSets: v.optional(v.number()),
    repRangeMin: v.optional(v.number()),
    repRangeMax: v.optional(v.number()),
    setRepTargets: v.optional(v.array(v.number())),
    startingWeightKg: v.optional(v.union(v.number(), v.null())),
    stepKg: v.optional(v.number()),
    plannedRestSeconds: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, { routineExerciseId, ...changes }) => {
    const userId = await requireIdentityId(ctx);
    const { routine, routineExercise } = await requireOwnedRoutineExercise(
      ctx,
      userId,
      routineExerciseId
    );

    const targetSets = changes.targetSets ?? routineExercise.targetSets;
    const repRangeMin = changes.repRangeMin ?? routineExercise.repRangeMin;
    const repRangeMax = changes.repRangeMax ?? routineExercise.repRangeMax;
    const setRepTargets = (
      changes.setRepTargets ?? routineExercise.setRepTargets
    ).slice(0, changes.setRepTargets ? undefined : targetSets);

    if (!Number.isInteger(targetSets) || targetSets < 1 || targetSets > 20) {
      throw new ConvexError('INVALID_TARGET_SETS');
    }
    if (
      !Number.isInteger(repRangeMin) ||
      !Number.isInteger(repRangeMax) ||
      repRangeMin < 1 ||
      repRangeMin > repRangeMax
    ) {
      throw new ConvexError('INVALID_REP_RANGE');
    }
    if (setRepTargets.length > targetSets) {
      throw new ConvexError('TOO_MANY_SET_TARGETS');
    }
    if (setRepTargets.some((reps) => !Number.isInteger(reps) || reps < 1)) {
      throw new ConvexError('INVALID_SET_TARGET');
    }
    if (changes.stepKg !== undefined && !(changes.stepKg > 0)) {
      throw new ConvexError('INVALID_STEP');
    }
    if (
      changes.startingWeightKg !== undefined &&
      changes.startingWeightKg !== null &&
      changes.startingWeightKg < 0
    ) {
      throw new ConvexError('INVALID_WEIGHT');
    }
    if (
      changes.plannedRestSeconds !== undefined &&
      changes.plannedRestSeconds !== null &&
      (!Number.isInteger(changes.plannedRestSeconds) ||
        changes.plannedRestSeconds < 0)
    ) {
      throw new ConvexError('INVALID_PLANNED_REST');
    }

    await ctx.db.patch(routineExercise._id, {
      targetSets,
      repRangeMin,
      repRangeMax,
      setRepTargets,
      ...(changes.stepKg !== undefined && { stepKg: changes.stepKg }),
      ...(changes.startingWeightKg !== undefined && {
        startingWeightKg: changes.startingWeightKg ?? undefined,
      }),
      ...(changes.plannedRestSeconds !== undefined && {
        plannedRestSeconds: changes.plannedRestSeconds ?? undefined,
      }),
    });
    await touch(ctx, routine._id);
  },
});

export const moveExercise = mutation({
  args: { routineExerciseId: v.id('routineExercises'), toIndex: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { routine, routineExercise } = await requireOwnedRoutineExercise(
      ctx,
      userId,
      args.routineExerciseId
    );
    const ordered = (await routineExercisesOf(ctx, routine._id)).filter(
      (other) => other._id !== routineExercise._id
    );
    const toIndex = Math.max(0, Math.min(args.toIndex, ordered.length));
    ordered.splice(toIndex, 0, routineExercise);
    await renumber(ctx, ordered);
    await touch(ctx, routine._id);
  },
});

export const removeExercise = mutation({
  args: { routineExerciseId: v.id('routineExercises') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { routine, routineExercise } = await requireOwnedRoutineExercise(
      ctx,
      userId,
      args.routineExerciseId
    );
    await ctx.db.delete(routineExercise._id);
    await renumber(ctx, await routineExercisesOf(ctx, routine._id));
    await ctx.db.patch(routine._id, {
      exerciseCount: routine.exerciseCount - 1,
      updatedAt: Date.now(),
    });
  },
});
