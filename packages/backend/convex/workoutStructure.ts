// Mid-Workout structure changes (remove, reorder, skip, swap, link and unlink
// Alternating sets) and saving them back to the Routine at finish. Changes
// apply to this Workout only until the member saves; saving applies exactly
// the plan the finish screen showed.
import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from './_generated/server';
import { afterBlock, gatherBlocks, joinRound } from './domain/rounds';
import { defaultStepKg } from './domain/units';
import { requireVisibleExercise } from './lib/exercises';
import { getIdentityId, requireIdentityId } from './lib/identity';
import { applyOverloadTargets } from './lib/overload';
import { roundExercisesOf, settleBlock } from './lib/rounds';
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

const blockOf = (item: { blockId?: string }) => item.blockId;

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

/**
 * After a member left a block: its open round settles, and a block down to
 * one Exercise dissolves (its credited rounds stay on the block).
 */
async function afterLeaving(
  ctx: MutationCtx,
  workoutId: Id<'workouts'>,
  blockId: Id<'workoutBlocks'> | undefined
) {
  if (!blockId) return;
  await settleBlock(ctx, workoutId, blockId);
  const members = (await workoutExercisesOf(ctx, workoutId)).filter(
    (item) => item.blockId === blockId
  );
  const [alone] = members;
  if (members.length === 1 && alone) {
    await ctx.db.patch(alone._id, { blockId: undefined });
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
    await afterLeaving(ctx, workout._id, workoutExercise.blockId);
  },
});

/**
 * Moves an Exercise to `toIndex` in this Workout's order. Blocks stay
 * together: a member reorders within its block, and others can't split one.
 */
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
    await writeOrder(
      ctx,
      gatherBlocks(
        [
          ...others.slice(0, toIndex),
          workoutExercise,
          ...others.slice(toIndex),
        ],
        blockOf
      )
    );
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
    if (args.skipped) {
      await settleBlock(ctx, workout._id, workoutExercise.blockId);
    } else {
      await joinOpenRound(ctx, workout._id, workoutExercise._id);
    }
  },
});

/** An Exercise that (re)joins a block joins its open round as pending. */
async function joinOpenRound(
  ctx: MutationCtx,
  workoutId: Id<'workouts'>,
  workoutExerciseId: Id<'workoutExercises'>
) {
  const workoutExercise = await ctx.db.get(workoutExerciseId);
  const block = workoutExercise?.blockId
    ? await ctx.db.get(workoutExercise.blockId)
    : null;
  if (!block?.round) return;
  const joining = (await roundExercisesOf(ctx, workoutId)).find(
    (item) => item.id === workoutExerciseId
  );
  if (!joining) return;
  await ctx.db.patch(block._id, {
    round: joinRound(block.round, joining) ?? undefined,
  });
}

/**
 * Links an Exercise into another's Alternating sets block for this Workout,
 * right after its last member. Logged Sets and credited rounds stay; it joins
 * the open round as pending, and the edit never starts rest.
 */
export const linkExercise = workoutMutation({
  args: {
    workoutExerciseId: v.id('workoutExercises'),
    withWorkoutExerciseId: v.id('workoutExercises'),
  },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { workout, workoutExercise } = await requireOwnedWorkoutExercise(
      ctx,
      userId,
      args.workoutExerciseId
    );
    const { workoutExercise: partner } = await requireOwnedWorkoutExercise(
      ctx,
      userId,
      args.withWorkoutExerciseId
    );
    requireActive(workout);
    if (
      partner.workoutId !== workout._id ||
      partner._id === workoutExercise._id
    ) {
      throw new ConvexError('INVALID_LINK');
    }
    if (partner.blockId && partner.blockId === workoutExercise.blockId) return;

    const blockId =
      partner.blockId ??
      (await ctx.db.insert('workoutBlocks', {
        workoutId: workout._id,
        plannedRestSeconds: partner.plannedRestSeconds,
        completedRounds: [],
      }));
    if (!partner.blockId) await ctx.db.patch(partner._id, { blockId });
    await ctx.db.patch(workoutExercise._id, { blockId });
    const ordered = await workoutExercisesOf(ctx, workout._id);
    const moving = ordered.find((item) => item._id === workoutExercise._id);
    if (moving) {
      await writeOrder(ctx, afterBlock(ordered, blockOf, blockId, moving));
    }
    await afterLeaving(ctx, workout._id, workoutExercise.blockId);
    await joinOpenRound(ctx, workout._id, workoutExercise._id);
  },
});

/**
 * Unlinks an Exercise from its block for this Workout; it carries on alone
 * right after the block. Logged Sets and credited rounds stay.
 */
export const unlinkExercise = workoutMutation({
  args: { workoutExerciseId: v.id('workoutExercises') },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const { workout, workoutExercise } = await requireOwnedWorkoutExercise(
      ctx,
      userId,
      args.workoutExerciseId
    );
    requireActive(workout);
    const { blockId } = workoutExercise;
    if (!blockId) return;
    await ctx.db.patch(workoutExercise._id, { blockId: undefined });
    const ordered = await workoutExercisesOf(ctx, workout._id);
    const moving = ordered.find((item) => item._id === workoutExercise._id);
    if (moving) {
      await writeOrder(ctx, afterBlock(ordered, blockOf, blockId, moving));
    }
    await afterLeaving(ctx, workout._id, blockId);
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

type Shape = {
  name: string;
  sets: number;
  restSeconds: number | null;
  /** In an Alternating sets block with the next Exercise. */
  linkedToNext: boolean;
};

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
  | { kind: 'linked'; exercises: string[] }
  | { kind: 'unlinked'; exercises: string[] }
  | {
      kind: 'blockRest';
      exercises: string[];
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

/** Blocks of two or more, in order. */
function blocksOf<Item>(
  items: readonly Item[],
  blockIdOf: (item: Item) => string | undefined
): Item[][] {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const blockId = blockIdOf(item);
    if (blockId) groups.set(blockId, [...(groups.get(blockId) ?? []), item]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

/** Which items are linked with the next one in a block of two or more. */
function linkedToNext<Item>(
  items: readonly Item[],
  blockIdOf: (item: Item) => string | undefined
): boolean[] {
  const linked = new Set(blocksOf(items, blockIdOf).flat());
  return items.map((item, index) => {
    const next = items[index + 1];
    return (
      linked.has(item) &&
      next !== undefined &&
      blockIdOf(next) === blockIdOf(item)
    );
  });
}

const sameMembers = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((key) => b.has(key));

/**
 * Compares the Workout with its Routine. Skipped Exercises keep their Routine
 * values (skipping is for this Workout only); skipped added ones drop out.
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
            linkedToNext: false,
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
      linkedToNext: false,
    };
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
  const plannedBlockOf = (entry: PlannedEntry) => entry.workoutExercise.blockId;
  for (const [index, linked] of linkedToNext(
    planned,
    plannedBlockOf
  ).entries()) {
    const entry = planned[index];
    if (entry) entry.shape.linkedToNext = linked;
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

  // Alternating sets blocks, compared by who is in them.
  const routineBlockOf = (item: Doc<'routineExercises'>) => item.blockId;
  const beforeBlocks = await Promise.all(
    blocksOf(routineExercises, routineBlockOf).map(async (members) => ({
      keys: new Set<string>(members.map((member) => member._id)),
      names: await Promise.all(
        members.map((member) => nameOf(member.exerciseId))
      ),
      restSeconds: members[0]?.blockId
        ? ((await ctx.db.get(members[0].blockId))?.plannedRestSeconds ?? null)
        : null,
    }))
  );
  const afterBlocks = await Promise.all(
    blocksOf(planned, plannedBlockOf).map(async (members) => {
      const blockId = members[0]?.workoutExercise.blockId;
      return {
        members,
        workoutBlock: blockId ? await ctx.db.get(blockId) : null,
        keys: new Set<string>(
          members.map(
            (entry) => entry.routineExercise?._id ?? entry.workoutExercise._id
          )
        ),
        names: members.map((entry) => entry.shape.name),
      };
    })
  );
  for (const after of afterBlocks) {
    const before = beforeBlocks.find((item) =>
      sameMembers(item.keys, after.keys)
    );
    const restSeconds = after.workoutBlock?.plannedRestSeconds ?? null;
    if (!before) {
      changes.push({ kind: 'linked', exercises: after.names });
    } else if (before.restSeconds !== restSeconds) {
      changes.push({
        kind: 'blockRest',
        exercises: after.names,
        from: before.restSeconds,
        to: restSeconds,
      });
    }
  }
  for (const before of beforeBlocks) {
    if (!afterBlocks.some((after) => sameMembers(after.keys, before.keys))) {
      changes.push({ kind: 'unlinked', exercises: before.names });
    }
  }

  const beforeLinks = linkedToNext(routineExercises, routineBlockOf);
  const before: Shape[] = [];
  for (const [index, routineExercise] of routineExercises.entries()) {
    before.push({
      name: await nameOf(routineExercise.exerciseId),
      sets: routineExercise.targetSets,
      restSeconds: routineExercise.plannedRestSeconds ?? null,
      linkedToNext: beforeLinks[index] ?? false,
    });
  }

  return { routine, planned, removed, before, afterBlocks, changes };
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
    const routineId = plan.routine._id;

    // Blocks first, so every Routine Exercise can point at its block.
    const existingBlocks = await ctx.db
      .query('routineBlocks')
      .withIndex('by_routine', (q) => q.eq('routineId', routineId))
      .collect();
    const keptBlocks = new Set<Id<'routineBlocks'>>();
    const blockFor = new Map<Id<'workoutExercises'>, Id<'routineBlocks'>>();
    for (const after of plan.afterBlocks) {
      const plannedRestSeconds = after.workoutBlock?.plannedRestSeconds;
      const reused = existingBlocks.find(
        (block) =>
          block._id === after.workoutBlock?.routineBlockId &&
          !keptBlocks.has(block._id)
      );
      const blockId =
        reused?._id ??
        (await ctx.db.insert('routineBlocks', {
          routineId,
          plannedRestSeconds,
        }));
      if (reused) await ctx.db.patch(reused._id, { plannedRestSeconds });
      keptBlocks.add(blockId);
      for (const entry of after.members) {
        blockFor.set(entry.workoutExercise._id, blockId);
      }
    }

    for (const routineExercise of plan.removed) {
      await ctx.db.delete(routineExercise._id);
    }
    for (const [order, entry] of plan.planned.entries()) {
      const { workoutExercise, routineExercise, shape } = entry;
      const blockId = blockFor.get(workoutExercise._id);
      if (!routineExercise) {
        const routineExerciseId = await ctx.db.insert('routineExercises', {
          routineId,
          exerciseId: workoutExercise.exerciseId,
          order,
          targetSets: shape.sets,
          repRangeMin: workoutExercise.repRangeMin,
          repRangeMax: workoutExercise.repRangeMax,
          setRepTargets: [],
          stepKg: workoutExercise.stepKg,
          plannedRestSeconds: shape.restSeconds ?? undefined,
          blockId,
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
        blockId,
        ...(swapped && {
          exerciseId: workoutExercise.exerciseId,
          stepKg: workoutExercise.stepKg,
        }),
      });
    }
    for (const block of existingBlocks) {
      if (!keptBlocks.has(block._id)) await ctx.db.delete(block._id);
    }
    await ctx.db.patch(routineId, { updatedAt: Date.now() });
  },
});
