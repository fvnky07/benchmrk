import { paginationOptsValidator } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { query } from './_generated/server';
import { timeByExercise } from './domain/time';
import { requireIdentityId } from './lib/identity';
import { recentExposures } from './lib/overload';
import { setsOfWorkout } from './lib/workoutData';
import { workoutView } from './lib/workoutView';
import {
  exerciseTypeValidator,
  overloadBasisValidator,
  setTargetValidator,
  setTypeValidator,
} from './schema';

const nullableNumber = v.union(v.number(), v.null());
const timeValidator = v.object({
  workingSeconds: v.number(),
  restSeconds: v.number(),
  transitionSeconds: v.number(),
  adherence: v.union(
    v.object({ actualSeconds: v.number(), plannedSeconds: v.number() }),
    v.null()
  ),
});
const loggedValuesValidator = v.object({
  weightKg: nullableNumber,
  reps: nullableNumber,
  durationSeconds: nullableNumber,
  distanceMeters: nullableNumber,
  rpe: nullableNumber,
});

function finishedAt(workout: Doc<'workouts'>): number {
  if (workout.finishedAt === undefined) throw new ConvexError('NOT_FOUND');
  return workout.finishedAt;
}

/** `stats` reads at most this many of the newest completed Workouts. */
const STATS_LIMIT = 500;

/** Completed Workouts, including those terminated early, newest finish first. */
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const result = await ctx.db
      .query('workouts')
      .withIndex('by_user_status_finished', (q) =>
        q.eq('userId', userId).eq('status', 'completed')
      )
      .order('desc')
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (workout) => {
          const end = finishedAt(workout);
          return {
            workoutId: workout._id,
            name: workout.name,
            startedAt: workout.startedAt,
            finishedAt: end,
            durationSeconds: Math.round((end - workout.startedAt) / 1000),
            setsDone: (await setsOfWorkout(ctx, workout._id)).filter(
              (set) => set.completedAt !== undefined
            ).length,
          };
        })
      ),
    };
  },
});

/**
 * Completed Workouts for stats, oldest first: completed Sets, Volume (weight ×
 * reps over the completed Sets that have both) and completed Sets per
 * Exercise. `since` is a lower bound on the finish time in ms, or null for
 * all; either way only the newest 500 are read.
 */
export const stats = query({
  args: { since: nullableNumber },
  returns: v.array(
    v.object({
      workoutId: v.id('workouts'),
      finishedAt: v.number(),
      sets: v.number(),
      volumeKg: v.number(),
      exercises: v.array(
        v.object({
          exerciseId: v.id('exercises'),
          name: v.string(),
          sets: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx, { since }) => {
    const userId = await requireIdentityId(ctx);
    const newestFirst = await ctx.db
      .query('workouts')
      .withIndex('by_user_status_finished', (q) => {
        const completed = q.eq('userId', userId).eq('status', 'completed');
        return since === null ? completed : completed.gte('finishedAt', since);
      })
      .order('desc')
      .take(STATS_LIMIT);
    const names = new Map<Id<'exercises'>, Promise<string>>();
    const nameOf = (exerciseId: Id<'exercises'>) => {
      let name = names.get(exerciseId);
      if (name === undefined) {
        name = ctx.db
          .get(exerciseId)
          .then((exercise) => exercise?.name ?? 'Exercise');
        names.set(exerciseId, name);
      }
      return name;
    };
    return Promise.all(
      newestFirst.reverse().map(async (workout) => {
        const completed = (await setsOfWorkout(ctx, workout._id)).filter(
          (set) => set.completedAt !== undefined
        );
        const setsByExercise = new Map<Id<'exercises'>, number>();
        let volumeKg = 0;
        for (const set of completed) {
          setsByExercise.set(
            set.exerciseId,
            (setsByExercise.get(set.exerciseId) ?? 0) + 1
          );
          if (set.weightKg !== undefined && set.reps !== undefined) {
            volumeKg += set.weightKg * set.reps;
          }
        }
        return {
          workoutId: workout._id,
          finishedAt: finishedAt(workout),
          sets: completed.length,
          volumeKg,
          exercises: await Promise.all(
            [...setsByExercise].map(async ([exerciseId, sets]) => ({
              exerciseId,
              name: await nameOf(exerciseId),
              sets,
            }))
          ),
        };
      })
    );
  },
});

/** A private, read-only record of a completed Workout and its saved targets. */
export const get = query({
  args: { workoutId: v.id('workouts') },
  returns: v.object({
    workoutId: v.id('workouts'),
    name: v.string(),
    startedAt: v.number(),
    finishedAt: v.number(),
    durationSeconds: v.number(),
    targetDurationSeconds: nullableNumber,
    note: v.union(v.string(), v.null()),
    time: timeValidator,
    exercises: v.array(
      v.object({
        workoutExerciseId: v.id('workoutExercises'),
        exerciseId: v.id('exercises'),
        name: v.string(),
        type: exerciseTypeValidator,
        skipped: v.boolean(),
        standingNote: v.union(v.string(), v.null()),
        time: v.union(timeValidator, v.null()),
        targets: v.object({
          repRange: v.object({ min: v.number(), max: v.number() }),
          lastTime: v.union(v.array(loggedValuesValidator), v.null()),
          suggested: v.array(setTargetValidator),
          basis: v.union(overloadBasisValidator, v.null()),
        }),
        sets: v.array(
          v.object({
            setId: v.id('sets'),
            order: v.number(),
            type: setTypeValidator,
            weightKg: nullableNumber,
            reps: nullableNumber,
            durationSeconds: nullableNumber,
            distanceMeters: nullableNumber,
            rpe: nullableNumber,
            completedAt: nullableNumber,
            note: v.union(v.string(), v.null()),
          })
        ),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const userId = await requireIdentityId(ctx);
    const workout = await ctx.db.get(args.workoutId);
    if (
      !workout ||
      workout.userId !== userId ||
      workout.status !== 'completed'
    ) {
      throw new ConvexError('NOT_FOUND');
    }
    const end = finishedAt(workout);
    const view = await workoutView(ctx, workout);
    const recordedSets: Record<string, Doc<'sets'>> = Object.fromEntries(
      (await setsOfWorkout(ctx, workout._id)).map((set) => [set._id, set])
    );
    const exerciseTimes = timeByExercise(
      view.exercises.flatMap((exercise) =>
        exercise.sets.flatMap((set) =>
          set.completedAt === null
            ? []
            : [
                {
                  workoutExerciseId: exercise._id,
                  blockId: exercise.blockId,
                  firstTouchedAt: set.firstTouchedAt,
                  completedAt: set.completedAt,
                  restAfter: recordedSets[set._id]?.restAfter ?? null,
                  loggedTogether:
                    recordedSets[set._id]?.loggedTogether ?? false,
                },
              ]
        )
      )
    );
    return {
      workoutId: workout._id,
      name: view.name,
      startedAt: view.startedAt,
      finishedAt: end,
      durationSeconds: Math.round((end - view.startedAt) / 1000),
      targetDurationSeconds: view.targetDurationSeconds,
      note: view.note,
      time: view.time,
      exercises: await Promise.all(
        view.exercises.map(async (exercise) => {
          const [last] = await recentExposures(
            ctx,
            userId,
            exercise.exerciseId,
            workout.startedAt
          );
          return {
            workoutExerciseId: exercise._id,
            exerciseId: exercise.exerciseId,
            name: exercise.name,
            type: exercise.type,
            skipped: exercise.skipped,
            standingNote: exercise.standingNote,
            time: exerciseTimes[exercise._id] ?? null,
            targets: {
              repRange: {
                min: exercise.repRangeMin,
                max: exercise.repRangeMax,
              },
              lastTime: last?.sets ?? null,
              suggested: exercise.sets.flatMap((set) =>
                (set.type === 'normal' || set.type === 'failure') && set.target
                  ? [set.target]
                  : []
              ),
              basis: exercise.overload,
            },
            sets: exercise.sets.map((set) => ({
              setId: set._id,
              order: set.order,
              type: set.type,
              weightKg: set.weightKg,
              reps: set.reps,
              durationSeconds: set.durationSeconds,
              distanceMeters: set.distanceMeters,
              rpe: set.rpe,
              completedAt: set.completedAt,
              note: set.note,
            })),
          };
        })
      ),
    };
  },
});
