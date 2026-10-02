import { fromKg, toKg, type WeightUnit } from './units';

/** RPE at or below which a rated Working Set allows a weight increase. */
const MAX_PASSING_RPE = 9;

/** One Working Set (normal or failure) as it was logged. */
export type LoggedSet = {
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
};

/**
 * A completed Workout in which the Exercise was trained (not skipped) with at
 * least one Working Set: its Working Sets in order.
 */
export type Exposure = { sets: LoggedSet[] };

export type OverloadReason =
  | 'routine-target'
  | 'rep-progression'
  | 'weight-increase';

export type SetTarget = { weightKg: number | null; reps: number };

export type OverloadPlan = {
  reason: OverloadReason;
  /** One target per planned Set; Sets beyond the plan get none. */
  sets: SetTarget[];
  /** A Working Set last time had no Effort rating; it counted as passing. */
  effortNotChecked: boolean;
};

export type OverloadInput = {
  exerciseType: 'strength' | 'bodyweight' | 'timed' | 'cardio';
  /** Newest first. */
  exposures: Exposure[];
  repRange: { min: number; max: number };
  plannedSets: number;
  /** A Routine's per-Set rep targets, used until the first exposure. */
  routineSetTargets: number[];
  startingWeightKg: number | null;
  stepKg: number;
  unit: WeightUnit;
};

/**
 * Last weight plus one step, rounded to the nearest multiple of the step in
 * the member's unit, and always strictly heavier than last time.
 */
export function increasedWeightKg(
  lastKg: number,
  stepKg: number,
  unit: WeightUnit
): number {
  const step = fromKg(stepKg, unit);
  const last = fromKg(lastKg, unit);
  let next = Math.round((last + step) / step) * step;
  if (next <= last + 1e-9) next += step;
  return toKg(Number(next.toFixed(4)), unit);
}

function routineTargets(input: OverloadInput): OverloadPlan | null {
  if (input.routineSetTargets.length === 0) return null;
  return {
    reason: 'routine-target',
    sets: Array.from({ length: input.plannedSets }, (_, index) => ({
      weightKg: input.startingWeightKg,
      reps:
        input.routineSetTargets[index] ??
        input.routineSetTargets.at(-1) ??
        input.repRange.min,
    })),
    effortNotChecked: false,
  };
}

/**
 * Per-Set Overload targets from the member's own history (locked rules):
 * reps progress by one per Set up to the top of the Rep range; weight goes up
 * one step only when every planned Working Set reached the top and every
 * rated one was RPE 9 or lower, then reps restart at the bottom. Only strength
 * and bodyweight Exercises get targets.
 */
export function overloadTargets(input: OverloadInput): OverloadPlan | null {
  if (
    input.exerciseType !== 'strength' &&
    input.exerciseType !== 'bodyweight'
  ) {
    return null;
  }
  const [last] = input.exposures;
  if (!last) return routineTargets(input);

  const { min, max } = input.repRange;
  const planned = last.sets.slice(0, input.plannedSets);
  const effortNotChecked = planned.some((set) => set.rpe === null);
  const everySetAtTop =
    planned.length === input.plannedSets &&
    planned.every((set) => (set.reps ?? 0) >= max);
  const effortAllows = planned.every(
    (set) => set.rpe === null || set.rpe <= MAX_PASSING_RPE
  );
  const lastOf = (index: number) =>
    planned[index] ??
    planned.at(-1) ?? { weightKg: null, reps: null, rpe: null };

  if (everySetAtTop && effortAllows) {
    return {
      reason: 'weight-increase',
      sets: Array.from({ length: input.plannedSets }, (_, index) => {
        const weightKg = lastOf(index).weightKg;
        return {
          weightKg:
            weightKg === null
              ? null
              : increasedWeightKg(weightKg, input.stepKg, input.unit),
          reps: min,
        };
      }),
      effortNotChecked,
    };
  }

  return {
    reason: 'rep-progression',
    sets: Array.from({ length: input.plannedSets }, (_, index) => {
      const set = lastOf(index);
      return {
        weightKg: set.weightKg,
        reps: Math.min((set.reps ?? min - 1) + 1, max),
      };
    }),
    effortNotChecked,
  };
}
