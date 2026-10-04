import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from './_generated/server';
import { afterBlock, gatherBlocks } from './domain/rounds';
import { targetDuration } from './domain/time';
import { defaultStepKg } from './domain/units';
import { requireVisibleExercise } from './lib/exercises';
import { getIdentityId, requireIdentityId } from './lib/identity';
import { recentDurations } from './lib/time';
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

const blockOf = (item: Doc<'routineExercises'>) => item.blockId;

/** A block down to one Exercise dissolves. */
async function dissolveIfAlone(
  ctx: MutationCtx,
  routineId: Id<'routines'>,
  blockId: Id<'routineBlocks'> | undefined
) {
  if (!blockId) return;
  const members = (await routineExercisesOf(ctx, routineId)).filter(
    (item) => item.blockId === blockId
  );
  if (members.length > 1) return;
  for (const member of members) {
    await ctx.db.patch(member._id, { blockId: undefined });
  }
  await ctx.db.delete(blockId);
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
    const ordered = await routineExercisesOf(ctx, routine._id);
    const exercises = await Promise.all(
      ordered.map(async (routineExercise, index) => {
        const exercise = await ctx.db.get(routineExercise.exerciseId);
        if (!exercise) throw new ConvexError('EXERCISE_NOT_FOUND');
        const next = ordered[index + 1];
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
          restSeconds: routineExercise.plannedRestSeconds ?? defaultRestSeconds,
          blockId: routineExercise.blockId ?? null,
          linkedToNext:
            routineExercise.blockId !== undefined &&
            next?.blockId === routineExercise.blockId,
        };
      })
    );
    const blocks = await ctx.db
      .query('routineBlocks')
      .withIndex('by_routine', (q) => q.eq('routineId', routine._id))
      .collect();

    return {
      _id: routine._id,
      name: routine.name,
      targetDurationSeconds: routine.targetDurationSeconds ?? null,
      /** The median of recent Workouts once 3 exist, before any override. */
      suggestedDurationSeconds: targetDuration(
        await recentDurations(ctx, routine._id, Number.MAX_SAFE_INTEGER),
        null
      ),
      exercises,
      blocks: blocks.map((block) => ({
        _id: block._id,
        plannedRestSeconds: block.plannedRestSeconds ?? null,
        restSeconds: block.plannedRestSeconds ?? defaultRestSeconds,
      })),
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
    const blocks = await ctx.db
      .query('routineBlocks')
      .withIndex('by_routine', (q) => q.eq('routineId', args.routineId))
      .collect();
    for (const block of blocks) await ctx.db.delete(block._id);
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
    // Blocks stay together: a member reorders within its block.
    await renumber(ctx, gatherBlocks(ordered, blockOf));
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
    await dissolveIfAlone(ctx, routine._id, routineExercise.blockId);
    await ctx.db.patch(routine._id, {
      exerciseCount: routine.exerciseCount - 1,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Links an Exercise into another's Alternating sets block (making one if
 * needed), right after the block's last member.
 */
export const linkExercises = mutation({
  args: {
    routineExerciseId: v.id('routineExercises'),
    withRoutineExerciseId: v.id('routineExercises'),
  },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { routine, routineExercise } = await requireOwnedRoutineExercise(
      ctx,
      userId,
      args.routineExerciseId
    );
    const { routineExercise: partner } = await requireOwnedRoutineExercise(
      ctx,
      userId,
      args.withRoutineExerciseId
    );
    if (
      partner.routineId !== routine._id ||
      partner._id === routineExercise._id
    ) {
      throw new ConvexError('INVALID_LINK');
    }
    if (partner.blockId && partner.blockId === routineExercise.blockId) return;

    const blockId =
      partner.blockId ??
      (await ctx.db.insert('routineBlocks', {
        routineId: routine._id,
        plannedRestSeconds: partner.plannedRestSeconds,
      }));
    if (!partner.blockId) await ctx.db.patch(partner._id, { blockId });
    await ctx.db.patch(routineExercise._id, { blockId });
    const ordered = await routineExercisesOf(ctx, routine._id);
    const moving = ordered.find((item) => item._id === routineExercise._id);
    if (moving) {
      await renumber(ctx, afterBlock(ordered, blockOf, blockId, moving));
    }
    await dissolveIfAlone(ctx, routine._id, routineExercise.blockId);
    await touch(ctx, routine._id);
  },
});

/** Unlinks an Exercise from its block; it stays right after the block. */
export const unlinkExercise = mutation({
  args: { routineExerciseId: v.id('routineExercises') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { routine, routineExercise } = await requireOwnedRoutineExercise(
      ctx,
      userId,
      args.routineExerciseId
    );
    const { blockId } = routineExercise;
    if (!blockId) return;
    await ctx.db.patch(routineExercise._id, { blockId: undefined });
    const ordered = await routineExercisesOf(ctx, routine._id);
    const moving = ordered.find((item) => item._id === routineExercise._id);
    if (moving) {
      await renumber(ctx, afterBlock(ordered, blockOf, blockId, moving));
    }
    await dissolveIfAlone(ctx, routine._id, blockId);
    await touch(ctx, routine._id);
  },
});

/** A block's planned rest after each round; null uses the default rest. */
export const setBlockRest = mutation({
  args: {
    routineBlockId: v.id('routineBlocks'),
    seconds: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const block = await ctx.db.get(args.routineBlockId);
    if (!block) throw new ConvexError('ROUTINE_NOT_FOUND');
    await requireOwnedRoutine(ctx, userId, block.routineId);
    if (
      args.seconds !== null &&
      (!Number.isInteger(args.seconds) || args.seconds < 0)
    ) {
      throw new ConvexError('INVALID_REST');
    }
    await ctx.db.patch(block._id, {
      plannedRestSeconds: args.seconds ?? undefined,
    });
    await touch(ctx, block.routineId);
  },
});
