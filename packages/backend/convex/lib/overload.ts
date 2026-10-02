// Feeds the pure overload engine from the member's history and saves its
// targets on a Workout Exercise's planned Sets.
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import {
  type Exposure,
  isStalled,
  type OverloadPlan,
  overloadTargets,
  type SetTarget,
} from '../domain/overload';
import { readMemberSettings } from '../memberSettings';
import {
  findActiveWorkout,
  setsOfExercise,
  workoutExercisesOf,
} from './workoutData';

export const isWorkingSet = (set: Doc<'sets'>) =>
  set.type === 'normal' || set.type === 'failure';

/** How far back the engine looks: the Plateau rule needs three Workouts. */
const MAX_EXPOSURES = 3;

export type StoredExposure = Exposure & {
  workoutExerciseId: Id<'workoutExercises'>;
};

/**
 * The member's most recent exposures to an Exercise, newest first: completed
 * Workouts (never abandoned or active ones) where it wasn't skipped and has a
 * logged Working Set. Walks the Sets newest first until enough exposures are
 * found. `before` restricts them to Workouts started before that moment, so a
 * past Workout's Last time excludes itself and later Workouts.
 */
export async function recentExposures(
  ctx: QueryCtx,
  userId: string,
  exerciseId: Id<'exercises'>,
  before?: number
): Promise<StoredExposure[]> {
  const exposures: StoredExposure[] = [];
  const checked = new Set<Id<'workoutExercises'>>();
  const newestFirst = ctx.db
    .query('sets')
    .withIndex('by_user_exercise', (q) =>
      q.eq('userId', userId).eq('exerciseId', exerciseId)
    )
    .order('desc');
  for await (const set of newestFirst) {
    if (exposures.length === MAX_EXPOSURES) break;
    if (checked.has(set.workoutExerciseId)) continue;
    if (!isWorkingSet(set) || set.completedAt === undefined) continue;
    checked.add(set.workoutExerciseId);
    const workoutExercise = await ctx.db.get(set.workoutExerciseId);
    if (!workoutExercise || workoutExercise.skipped) continue;
    const workout = await ctx.db.get(workoutExercise.workoutId);
    if (
      workout?.status !== 'completed' ||
      (before !== undefined && workout.startedAt >= before)
    ) {
      continue;
    }

    const working = (await setsOfExercise(ctx, workoutExercise._id)).filter(
      isWorkingSet
    );
    const { overload } = workoutExercise;
    exposures.push({
      workoutExerciseId: workoutExercise._id,
      sets: working
        .filter((item) => item.completedAt !== undefined)
        .map((item) => ({
          weightKg: item.weightKg ?? null,
          reps: item.reps ?? null,
          durationSeconds: item.durationSeconds ?? null,
          distanceMeters: item.distanceMeters ?? null,
          rpe: item.rpe ?? null,
        })),
      repRange: {
        min: workoutExercise.repRangeMin,
        max: workoutExercise.repRangeMax,
      },
      reason: overload?.reason ?? null,
      stalled:
        overload !== undefined &&
        isStalled(
          overload,
          working.map((item) => ({
            target: item.target ?? null,
            logged: item.completedAt !== undefined,
            weightKg: item.weightKg ?? null,
            reps: item.reps ?? null,
          }))
        ),
      plateauDismissed: workoutExercise.plateauDismissed ?? false,
    });
  }
  return exposures;
}

/**
 * Gives an unlogged Set a new target (or none). Values that still came from
 * the old target follow it, so a Set never shows one target and logs another.
 */
export function retargetPatch(
  set: Doc<'sets'>,
  target: SetTarget | undefined
): Partial<Doc<'sets'>> {
  const weightFollows = set.fromTarget?.weight === true;
  const repsFollows = set.fromTarget?.reps === true;
  const weightKg = target?.weightKg ?? undefined;
  return {
    target,
    ...(weightFollows && { weightKg }),
    ...(repsFollows && { reps: target?.reps }),
    fromTarget: target
      ? {
          weight: weightFollows && weightKg !== undefined,
          reps: repsFollows,
        }
      : undefined,
  };
}

function basisOf(
  plan: OverloadPlan
): NonNullable<Doc<'workoutExercises'>['overload']> {
  return {
    reason: plan.reason,
    effortNotChecked: plan.effortNotChecked,
    effortBlocked: plan.effortBlocked,
    plateau: plan.plateau,
    repRangeChanged: plan.repRangeChanged,
    edited: false,
    declined: false,
  };
}

/**
 * Computes the Overload targets for an Exercise in a Workout and saves them
 * on its unlogged Working Sets, by position. Runs when the Exercise enters the
 * Workout (start, add or swap) and when targets are switched or reset. With
 * no history only the Routine's starting weight is prefilled; timed and
 * cardio Sets get the previous Workout's Set to show instead of a target.
 */
export async function applyOverloadTargets(
  ctx: MutationCtx,
  workoutExercise: Doc<'workoutExercises'>
) {
  const workout = await ctx.db.get(workoutExercise.workoutId);
  const exercise = await ctx.db.get(workoutExercise.exerciseId);
  if (!workout || !exercise) return;
  const settings = await readMemberSettings(ctx, workout.userId);
  const routineExercise = workoutExercise.routineExerciseId
    ? await ctx.db.get(workoutExercise.routineExerciseId)
    : null;
  const fromRoutine =
    routineExercise?.exerciseId === workoutExercise.exerciseId
      ? routineExercise
      : null;
  const working = (await setsOfExercise(ctx, workoutExercise._id)).filter(
    isWorkingSet
  );
  const exposures = await recentExposures(ctx, workout.userId, exercise._id);
  const enabled =
    settings.overloadTargets &&
    !settings.targetsOffExerciseIds.includes(exercise._id);

  const plan = enabled
    ? overloadTargets({
        exerciseType: exercise.type,
        exposures,
        repRange: {
          min: workoutExercise.repRangeMin,
          max: workoutExercise.repRangeMax,
        },
        plannedSets: working.length,
        routineSetTargets: fromRoutine?.setRepTargets ?? [],
        startingWeightKg: fromRoutine?.startingWeightKg ?? null,
        stepKg: workoutExercise.stepKg,
        smallestIncrementKg: settings.smallestIncrementKg,
        unit: settings.units,
      })
    : null;
  await ctx.db.patch(workoutExercise._id, {
    overload: plan ? basisOf(plan) : undefined,
  });

  const showsPrevious = exercise.type === 'timed' || exercise.type === 'cardio';
  const previousSets = exposures[0]?.sets ?? [];
  const startingWeightKg =
    exposures.length === 0 ? fromRoutine?.startingWeightKg : undefined;
  for (const [index, set] of working.entries()) {
    if (set.completedAt !== undefined) continue;
    const target = plan?.sets[index];
    const previous = showsPrevious
      ? (previousSets[index] ?? previousSets.at(-1))
      : undefined;
    await ctx.db.patch(set._id, {
      ...retargetPatch(set, target),
      previous: previous && {
        durationSeconds: previous.durationSeconds ?? undefined,
        distanceMeters: previous.distanceMeters ?? undefined,
      },
      ...(!target &&
        startingWeightKg !== undefined &&
        set.weightKg === undefined && { weightKg: startingWeightKg }),
    });
  }
}

/**
 * Recomputes the active Workout's targets after a switch, for one Exercise or
 * all of them. Declined targets stay declined for the Workout.
 */
export async function replanActiveWorkout(
  ctx: MutationCtx,
  userId: string,
  exerciseId?: Id<'exercises'>
) {
  const workout = await findActiveWorkout(ctx, userId);
  if (!workout) return;
  for (const workoutExercise of await workoutExercisesOf(ctx, workout._id)) {
    if (exerciseId && workoutExercise.exerciseId !== exerciseId) continue;
    if (workoutExercise.overload?.declined) continue;
    await applyOverloadTargets(ctx, workoutExercise);
  }
}
