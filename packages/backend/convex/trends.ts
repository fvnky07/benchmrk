import { ConvexError, v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { type QueryCtx, query } from './_generated/server';
import {
  type TimeBreakdown,
  type TimedSet,
  timeBreakdown,
  timeByExercise,
} from './domain/time';
import { requireIdentityId } from './lib/identity';
import { setsOfExercise, workoutExercisesOf } from './lib/workoutData';

const RECENT_WORKOUTS = 12;
const pointValidator = v.object({
  label: v.string(),
  value: v.number(),
  at: v.number(),
});
const trendsValidator = v.object({
  duration: v.array(pointValidator),
  rest: v.object({
    points: v.array(pointValidator),
    plannedSeconds: v.union(v.number(), v.null()),
  }),
});

type TrendPoint = { label: string; value: number; at: number };
type WorkoutTrend = {
  at: number;
  durationSeconds: number;
  adherence: TimeBreakdown['adherence'];
};

async function timedSetsOf(
  ctx: QueryCtx,
  workoutId: Id<'workouts'>
): Promise<{ exercises: Doc<'workoutExercises'>[]; sets: TimedSet[] }> {
  const exercises = await workoutExercisesOf(ctx, workoutId);
  const sets = await Promise.all(
    exercises.map(async (exercise) =>
      (await setsOfExercise(ctx, exercise._id)).flatMap((set) =>
        set.completedAt === undefined
          ? []
          : [
              {
                workoutExerciseId: exercise._id,
                blockId: exercise.blockId ?? null,
                firstTouchedAt: set.firstTouchedAt ?? null,
                completedAt: set.completedAt,
                restAfter: set.restAfter ?? null,
                loggedTogether: set.loggedTogether ?? false,
              },
            ]
      )
    )
  );
  return { exercises, sets: sets.flat() };
}

function trendSeries(workouts: WorkoutTrend[]) {
  const duration: TrendPoint[] = [];
  const rest: TrendPoint[] = [];
  let plannedSeconds: number | null = null;
  for (const workout of workouts) {
    const label = new Date(workout.at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
    duration.push({ label, at: workout.at, value: workout.durationSeconds });
    if (workout.adherence) {
      rest.push({
        label,
        at: workout.at,
        value: workout.adherence.actualSeconds,
      });
      plannedSeconds = workout.adherence.plannedSeconds;
    }
  }
  return { duration, rest: { points: rest, plannedSeconds } };
}

export const forExercise = query({
  args: { exerciseId: v.id('exercises') },
  returns: trendsValidator,
  handler: async (ctx, { exerciseId }) => {
    const identityId = await requireIdentityId(ctx);
    const sets = await ctx.db
      .query('sets')
      .withIndex('by_user_exercise', (q) =>
        q.eq('userId', identityId).eq('exerciseId', exerciseId)
      )
      .collect();
    const workouts = (
      await Promise.all(
        [...new Set(sets.map((set) => set.workoutId))].map((id) =>
          ctx.db.get(id)
        )
      )
    )
      .filter(
        (workout): workout is Doc<'workouts'> =>
          workout !== null &&
          workout.userId === identityId &&
          workout.status === 'completed'
      )
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, RECENT_WORKOUTS)
      .reverse();
    return trendSeries(
      await Promise.all(
        workouts.map(async (workout) => {
          const { exercises, sets: timedSets } = await timedSetsOf(
            ctx,
            workout._id
          );
          const breakdowns = timeByExercise(timedSets);
          const instances = exercises.filter(
            (exercise) => exercise.exerciseId === exerciseId
          );
          const restSamples: Record<string, number> = {};
          if (instances.length > 1) {
            // Keep each measured rest equally weighted across repeated instances.
            // Retain all Sets so Alternating sets and transitions keep their order.
            const ordered = [...timedSets].sort(
              (a, b) => a.completedAt - b.completedAt
            );
            for (const [index, set] of ordered.entries()) {
              const previous = ordered[index - 1];
              if (
                previous?.restAfter &&
                !previous.loggedTogether &&
                !set.loggedTogether &&
                (set.workoutExerciseId === previous.workoutExerciseId ||
                  (set.blockId !== null && set.blockId === previous.blockId))
              ) {
                restSamples[set.workoutExerciseId] =
                  (restSamples[set.workoutExerciseId] ?? 0) + 1;
              }
            }
          }
          let durationSeconds = 0;
          let actualSeconds = 0;
          let plannedSeconds = 0;
          let measuredSamples = 0;
          for (const exercise of instances) {
            const breakdown = breakdowns[exercise._id];
            if (!breakdown) continue;
            durationSeconds +=
              breakdown.workingSeconds +
              breakdown.restSeconds +
              breakdown.transitionSeconds;
            if (breakdown.adherence) {
              const samples =
                instances.length === 1 ? 1 : (restSamples[exercise._id] ?? 0);
              actualSeconds += breakdown.adherence.actualSeconds * samples;
              plannedSeconds += breakdown.adherence.plannedSeconds * samples;
              measuredSamples += samples;
            }
          }
          return {
            at: workout.startedAt,
            durationSeconds,
            adherence:
              measuredSamples === 0
                ? null
                : {
                    actualSeconds: Math.round(actualSeconds / measuredSamples),
                    plannedSeconds: Math.round(
                      plannedSeconds / measuredSamples
                    ),
                  },
          };
        })
      )
    );
  },
});

export const forRoutine = query({
  args: { routineId: v.id('routines') },
  returns: trendsValidator,
  handler: async (ctx, { routineId }) => {
    const identityId = await requireIdentityId(ctx);
    const routine = await ctx.db.get(routineId);
    if (!routine || routine.userId !== identityId) {
      throw new ConvexError('NOT_FOUND');
    }
    const workouts = await ctx.db
      .query('workouts')
      .withIndex('by_routine_status', (q) =>
        q.eq('routineId', routineId).eq('status', 'completed')
      )
      .filter((q) => q.eq(q.field('userId'), identityId))
      .order('desc')
      .take(RECENT_WORKOUTS);
    return trendSeries(
      await Promise.all(
        workouts.reverse().map(async (workout) => {
          const { sets } = await timedSetsOf(ctx, workout._id);
          return {
            at: workout.startedAt,
            durationSeconds:
              ((workout.finishedAt ?? workout.startedAt) - workout.startedAt) /
              1000,
            adherence: timeBreakdown(sets).adherence,
          };
        })
      )
    );
  },
});
