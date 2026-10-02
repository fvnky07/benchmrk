// Runs the Alternating sets round engine against a Workout's stored blocks.
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import {
  blockMembers,
  type Round,
  type RoundExercise,
  settleRound,
} from '../domain/rounds';
import { setsOfWorkout, workoutExercisesOf } from './workoutData';

export type WorkoutRound = Round<Id<'workoutExercises'>>;

/** The Workout's Exercises as the round engine counts them, in order. */
export async function roundExercisesOf(
  ctx: QueryCtx,
  workoutId: Id<'workouts'>
): Promise<RoundExercise<Id<'workoutExercises'>>[]> {
  const sets = await setsOfWorkout(ctx, workoutId);
  return (await workoutExercisesOf(ctx, workoutId)).map((workoutExercise) => {
    const counted = sets.filter(
      (set) =>
        set.workoutExerciseId === workoutExercise._id && set.type !== 'warmup'
    );
    const setsDone = counted.filter(
      (set) => set.completedAt !== undefined
    ).length;
    return {
      id: workoutExercise._id,
      blockId: workoutExercise.blockId ?? null,
      setsLeft: workoutExercise.skipped ? 0 : counted.length - setsDone,
      setsDone,
    };
  });
}

/** Saves a block's round after a change, crediting a completed round. */
export async function saveRound(
  ctx: MutationCtx,
  block: Doc<'workoutBlocks'>,
  change: { round: WorkoutRound | null; completedRound: WorkoutRound | null },
  now: number
) {
  await ctx.db.patch(block._id, {
    round: change.round ?? undefined,
    ...(change.completedRound && {
      completedRounds: [
        ...block.completedRounds,
        { ...change.completedRound, completedAt: now },
      ],
    }),
  });
}

/** Re-settles a block's open round after its members or their Sets changed. */
export async function settleBlock(
  ctx: MutationCtx,
  workoutId: Id<'workouts'>,
  blockId: Id<'workoutBlocks'> | undefined
) {
  const block = blockId ? await ctx.db.get(blockId) : null;
  if (!block?.round) return;
  const exercises = await roundExercisesOf(ctx, workoutId);
  await saveRound(
    ctx,
    block,
    settleRound(block.round, blockMembers(exercises, block._id)),
    Date.now()
  );
}
