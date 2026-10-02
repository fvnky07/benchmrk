import type { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import {
  afterSet,
  blockMembers,
  currentRound,
  type RoundExercise,
  skipForNow,
} from '@repo/backend/convex/domain/rounds';
import type { FunctionReturnType } from 'convex/server';

export type ActiveWorkout = NonNullable<
  FunctionReturnType<typeof api.workouts.getActive>
>;

type WorkoutExerciseId = Id<'workoutExercises'>;

/** The active Workout's Exercises as the round engine counts them. */
export function roundExercises(
  workout: ActiveWorkout
): RoundExercise<WorkoutExerciseId>[] {
  return workout.exercises.map((exercise) => {
    const counted = exercise.sets.filter((set) => set.type !== 'warmup');
    const setsDone = counted.filter((set) => set.completedAt !== null).length;
    return {
      id: exercise._id,
      blockId: exercise.blockId,
      setsLeft: exercise.skipped ? 0 : counted.length - setsDone,
      setsDone,
    };
  });
}

function blockOf(workout: ActiveWorkout, workoutExerciseId: WorkoutExerciseId) {
  const exercise = workout.exercises.find(
    (item) => item._id === workoutExerciseId
  );
  return workout.blocks.find((item) => item._id === exercise?.blockId);
}

/** The other Exercises of an Exercise's Alternating sets block. */
export function blockPartners(
  workout: ActiveWorkout,
  workoutExerciseId: WorkoutExerciseId
) {
  const members = blockMembers(
    roundExercises(workout),
    blockOf(workout, workoutExerciseId)?._id ?? null
  );
  return workout.exercises.filter(
    (item) =>
      item._id !== workoutExerciseId &&
      members.some((member) => member.id === item._id)
  );
}

/** The round an Exercise's block is on (open, or the next one to open). */
export function roundNumber(
  workout: ActiveWorkout,
  workoutExerciseId: WorkoutExerciseId
): number | null {
  const block = blockOf(workout, workoutExerciseId);
  if (!block) return null;
  const members = blockMembers(roundExercises(workout), block._id);
  return currentRound(members, block.round)?.number ?? null;
}

/** Whether Skip for now has somewhere to go. */
export function canSkipForNow(
  workout: ActiveWorkout,
  workoutExerciseId: WorkoutExerciseId
): boolean {
  return (
    skipForNow({
      exercises: roundExercises(workout),
      skippedId: workoutExerciseId,
      open: blockOf(workout, workoutExerciseId)?.round ?? null,
    }) !== null
  );
}

/**
 * The active Workout right after logging a Set, as the backend computes it
 * with the same round engine: the Set logged, the round credited, the planned
 * rest started, and the Exercise to show next.
 */
export function withSetLogged(
  workout: ActiveWorkout,
  setId: Id<'sets'>,
  now: number,
  settings: { autoAdvance: boolean; defaultRestSeconds: number }
): {
  workout: ActiveWorkout;
  next: WorkoutExerciseId | null;
  roundCompleted: boolean;
} | null {
  const exercise = workout.exercises.find((item) =>
    item.sets.some((set) => set._id === setId)
  );
  const set = exercise?.sets.find((item) => item._id === setId);
  if (!exercise || !set || set.completedAt !== null) return null;

  const logged: ActiveWorkout = {
    ...workout,
    progress:
      set.type === 'warmup'
        ? workout.progress
        : { ...workout.progress, done: workout.progress.done + 1 },
    exercises: workout.exercises.map((item) =>
      item._id === exercise._id
        ? {
            ...item,
            sets: item.sets.map((each) =>
              each._id === setId ? { ...each, completedAt: now } : each
            ),
          }
        : item
    ),
  };
  const block = blockOf(workout, exercise._id);
  const exercises = roundExercises(logged);
  const result = afterSet({
    exercises,
    completedId: exercise._id,
    open: block?.round ?? null,
    warmup: set.type === 'warmup',
    autoAdvance: settings.autoAdvance,
  });
  const inBlock =
    block !== undefined && blockMembers(exercises, block._id).length > 0;
  const plannedSeconds =
    result.rest === 'block'
      ? (block?.plannedRestSeconds ?? settings.defaultRestSeconds)
      : result.rest === 'exercise'
        ? (exercise.plannedRestSeconds ?? settings.defaultRestSeconds)
        : 0;

  return {
    next: result.next,
    roundCompleted: result.completedRound !== null,
    workout: {
      ...logged,
      rest:
        plannedSeconds > 0
          ? {
              startedAt: now,
              plannedSeconds,
              adjustedSeconds: 0,
              endsAt: now + plannedSeconds * 1000,
            }
          : null,
      blocks: logged.blocks.map((item) =>
        inBlock && item._id === block._id
          ? {
              ...item,
              round: result.round,
              roundsCompleted:
                item.roundsCompleted + (result.completedRound ? 1 : 0),
            }
          : item
      ),
    },
  };
}
