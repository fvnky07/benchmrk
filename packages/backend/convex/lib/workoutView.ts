import { ConvexError } from 'convex/values';

import type { Doc } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';
import { type TimedSet, targetDuration, timeBreakdown } from '../domain/time';
import { hasMachineSetup } from '../machineSetups';
import { recentDurations } from './time';
import {
  progressOf,
  restEndsAt,
  setsOfExercise,
  workoutExercisesOf,
} from './workoutData';

/** The member's Workout as the Workout and finish screens read it. */
export async function workoutView(ctx: QueryCtx, workout: Doc<'workouts'>) {
  const routine = workout.routineId
    ? await ctx.db.get(workout.routineId)
    : null;
  const notes = await ctx.db
    .query('notes')
    .withIndex('by_user_workout', (q) =>
      q.eq('userId', workout.userId).eq('workoutId', workout._id)
    )
    .collect();
  const rows = await Promise.all(
    (await workoutExercisesOf(ctx, workout._id)).map(
      async (workoutExercise) => {
        const exercise = await ctx.db.get(workoutExercise.exerciseId);
        if (!exercise) throw new ConvexError('EXERCISE_NOT_FOUND');
        const sets = await setsOfExercise(ctx, workoutExercise._id);
        const standingNote = await ctx.db
          .query('notes')
          .withIndex('by_user_exercise', (q) =>
            q
              .eq('userId', workout.userId)
              .eq('kind', 'exercise')
              .eq('exerciseId', exercise._id)
          )
          .unique();
        const machineSetup = hasMachineSetup(exercise.equipment)
          ? await ctx.db
              .query('machineSetups')
              .withIndex('by_user_exercise', (q) =>
                q.eq('userId', workout.userId).eq('exerciseId', exercise._id)
              )
              .unique()
          : null;
        // Collected per Exercise and joined in view order below, so Sets
        // logged at the same moment always reach timeBreakdown in one order.
        const timed: TimedSet[] = sets.flatMap((set) =>
          set.completedAt === undefined
            ? []
            : [
                {
                  workoutExerciseId: workoutExercise._id,
                  blockId: workoutExercise.blockId ?? null,
                  firstTouchedAt: set.firstTouchedAt ?? null,
                  completedAt: set.completedAt,
                  restAfter: set.restAfter ?? null,
                  loggedTogether: set.loggedTogether ?? false,
                },
              ]
        );
        const view = {
          _id: workoutExercise._id,
          exerciseId: exercise._id,
          name: exercise.name,
          slug: exercise.slug,
          type: exercise.type,
          equipment: exercise.equipment,
          repRangeMin: workoutExercise.repRangeMin,
          repRangeMax: workoutExercise.repRangeMax,
          stepKg: workoutExercise.stepKg,
          plannedRestSeconds: workoutExercise.plannedRestSeconds ?? null,
          skipped: workoutExercise.skipped ?? false,
          overload: workoutExercise.overload ?? null,
          blockId: workoutExercise.blockId ?? null,
          standingNote: standingNote?.text ?? null,
          machineSetup: machineSetup
            ? { positions: machineSetup.positions, custom: machineSetup.custom }
            : null,
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
            target: set.target ?? null,
            fromTarget: set.fromTarget ?? null,
            previous: set.previous ?? null,
            note: notes.find((note) => note.setId === set._id)?.text ?? null,
            firstTouchedAt: set.firstTouchedAt ?? null,
          })),
        };
        return { view, timed };
      }
    )
  );
  const exercises = rows.map((row) => row.view);
  const timedSets = rows.flatMap((row) => row.timed);

  return {
    _id: workout._id,
    name: workout.name,
    routineId: workout.routineId ?? null,
    status: workout.status,
    startedAt: workout.startedAt,
    finishedAt: workout.finishedAt ?? null,
    finishReason: workout.finishReason ?? null,
    progress: await progressOf(ctx, workout._id),
    rest: workout.rest
      ? {
          startedAt: workout.rest.startedAt,
          plannedSeconds: workout.rest.plannedSeconds,
          adjustedSeconds: workout.rest.adjustedSeconds,
          endsAt: restEndsAt(workout.rest),
        }
      : null,
    exercises,
    note: notes.find((note) => note.kind === 'workout')?.text ?? null,
    /** Working, rest and transition estimates from the recorded moments. */
    time: timeBreakdown(timedSets),
    targetDurationSeconds: routine
      ? targetDuration(
          await recentDurations(ctx, routine._id, workout.startedAt),
          routine.targetDurationSeconds ?? null
        )
      : null,
    blocks: (
      await ctx.db
        .query('workoutBlocks')
        .withIndex('by_workout', (q) => q.eq('workoutId', workout._id))
        .collect()
    ).map((block) => ({
      _id: block._id,
      plannedRestSeconds: block.plannedRestSeconds ?? null,
      round: block.round ?? null,
      roundsCompleted: block.completedRounds.length,
    })),
  };
}
