// Feeds the pure overload engine from the member's history and saves its
// targets on a Workout Exercise's planned Sets.
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { type Exposure, overloadTargets } from '../domain/overload';
import { readMemberSettings } from '../memberSettings';
import { setsOfExercise } from './workoutData';

const isWorking = (set: Doc<'sets'>) =>
  set.type === 'normal' || set.type === 'failure';

/** How far back the engine looks: the Plateau rule needs three Workouts. */
const MAX_EXPOSURES = 3;

/**
 * The member's most recent exposures to an Exercise, newest first: completed
 * Workouts (never abandoned or active ones) where it wasn't skipped and has a
 * logged Working Set. Walks the Sets newest first, so reads stay bounded no
 * matter how long the history is.
 */
export async function recentExposures(
  ctx: QueryCtx,
  userId: string,
  exerciseId: Id<'exercises'>
): Promise<Exposure[]> {
  const exposures: Exposure[] = [];
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
    if (!isWorking(set) || set.completedAt === undefined) continue;
    checked.add(set.workoutExerciseId);
    const workoutExercise = await ctx.db.get(set.workoutExerciseId);
    if (!workoutExercise || workoutExercise.skipped) continue;
    const workout = await ctx.db.get(workoutExercise.workoutId);
    if (workout?.status !== 'completed') continue;
    const logged = (await setsOfExercise(ctx, workoutExercise._id)).filter(
      (item) => isWorking(item) && item.completedAt !== undefined
    );
    exposures.push({
      sets: logged.map((item) => ({
        weightKg: item.weightKg ?? null,
        reps: item.reps ?? null,
        rpe: item.rpe ?? null,
      })),
    });
  }
  return exposures;
}

/**
 * Computes the Overload targets for an Exercise that just entered a Workout
 * (at start, add or swap) and saves them on its unlogged planned Sets. With
 * no history and no Routine per-Set targets, only the Routine's starting
 * weight is prefilled.
 */
export async function applyOverloadTargets(
  ctx: MutationCtx,
  workoutExercise: Doc<'workoutExercises'>
) {
  const workout = await ctx.db.get(workoutExercise.workoutId);
  const exercise = await ctx.db.get(workoutExercise.exerciseId);
  if (!workout || !exercise) return;
  const routineExercise = workoutExercise.routineExerciseId
    ? await ctx.db.get(workoutExercise.routineExerciseId)
    : null;
  const sameExercise =
    routineExercise?.exerciseId === workoutExercise.exerciseId;
  const { units } = await readMemberSettings(ctx, workout.userId);
  const planned = (await setsOfExercise(ctx, workoutExercise._id)).filter(
    (set) => isWorking(set) && set.completedAt === undefined
  );

  const plan = overloadTargets({
    exerciseType: exercise.type,
    exposures: await recentExposures(ctx, workout.userId, exercise._id),
    repRange: {
      min: workoutExercise.repRangeMin,
      max: workoutExercise.repRangeMax,
    },
    plannedSets: planned.length,
    routineSetTargets: sameExercise
      ? (routineExercise?.setRepTargets ?? [])
      : [],
    startingWeightKg: sameExercise
      ? (routineExercise?.startingWeightKg ?? null)
      : null,
    stepKg: workoutExercise.stepKg,
    unit: units,
  });

  for (const [index, set] of planned.entries()) {
    const target = plan?.sets[index];
    if (target && plan) {
      await ctx.db.patch(set._id, {
        target: {
          weightKg: target.weightKg,
          reps: target.reps,
          reason: plan.reason,
          effortNotChecked: plan.effortNotChecked,
        },
      });
    } else {
      const startingWeightKg = sameExercise
        ? routineExercise?.startingWeightKg
        : undefined;
      await ctx.db.patch(set._id, {
        target: undefined,
        ...(startingWeightKg !== undefined &&
          set.weightKg === undefined && { weightKg: startingWeightKg }),
      });
    }
  }
}
