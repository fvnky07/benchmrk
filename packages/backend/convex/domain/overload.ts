import { fromKg, toKg, type WeightUnit } from './units';

/** RPE at or below which a rated Working Set allows a weight increase. */
const MAX_PASSING_RPE = 9;

/** A Plateau is this many consecutive Stalled Workouts. */
const PLATEAU_STALLS = 3;

export type RepRange = { min: number; max: number };

/** One Working Set (normal or failure) as it was logged. */
export type LoggedSet = {
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  rpe: number | null;
};

export type OverloadReason =
  | 'baseline'
  | 'routine-target'
  | 'rep-progression'
  | 'weight-increase'
  | 'hold-below-range'
  | 'smaller-jump';

export type SetTarget = { weightKg: number | null; reps: number };

export type PlannedSet = {
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  logged: boolean;
  target: SetTarget | null;
};

/**
 * A completed Workout in which the Exercise was trained (not skipped) with at
 * least one logged Working Set.
 */
export type Exposure = {
  /** Its logged Working Sets, in order. */
  sets: LoggedSet[];
  /** Planned Working Sets, including misses; extra Sets never drive progression. */
  plannedSets: PlannedSet[];
  repRange: RepRange;
  /** What its targets were based on; null when it had none. */
  reason: OverloadReason | null;
  /** A Stalled Workout: it missed its Overload target. */
  stalled: boolean;
  /** The Plateau flag was dismissed while this was the newest exposure. */
  plateauDismissed: boolean;
};

export type OverloadPlan = {
  reason: OverloadReason;
  /** One target per planned Set; none for a baseline. */
  sets: SetTarget[];
  /** A Working Set last time had no Effort rating; it counted as passing. */
  effortNotChecked: boolean;
  /** Every Working Set reached the top, but one was rated above RPE 9. */
  effortBlocked: boolean;
  /** Three consecutive Stalled Workouts, not dismissed. */
  plateau: boolean;
  /** The Rep range differs from last time: weight kept, reps clamped. */
  repRangeChanged: boolean;
};

export type OverloadInput = {
  exerciseType: 'strength' | 'bodyweight' | 'timed' | 'cardio';
  /** Newest first. */
  exposures: Exposure[];
  repRange: RepRange;
  plannedSets: number;
  /** A Routine's per-Set rep targets, used until the first exposure. */
  routineSetTargets: number[];
  startingWeightKg: number | null;
  stepKg: number;
  smallestIncrementKg: number;
  unit: WeightUnit;
};

/** A logged Set met its target: target reps at the target weight or heavier. */
export function meetsTarget(
  set: { weightKg?: number | null; reps?: number | null },
  target: SetTarget
): boolean {
  return (
    (set.reps ?? 0) >= target.reps &&
    (target.weightKg === null || (set.weightKg ?? 0) >= target.weightKg)
  );
}

/**
 * A Stalled Workout: some targeted Working Set wasn't logged at its target.
 * Declined and edited targets are never penalised, and a Rep range change
 * never counts as a stall.
 */
export function isStalled(
  basis: { declined: boolean; edited: boolean; repRangeChanged: boolean },
  sets: readonly {
    target: SetTarget | null;
    logged: boolean;
    weightKg: number | null;
    reps: number | null;
  }[]
): boolean {
  if (basis.declined || basis.edited || basis.repRangeChanged) return false;
  const targeted = sets.filter((set) => set.target !== null);
  return targeted.some(
    (set) =>
      !set.logged || (set.target !== null && !meetsTarget(set, set.target))
  );
}

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

/**
 * The weight before a failed increase plus half the step, floored to the
 * smallest increment; null when that leaves no jump at all.
 */
export function smallerJumpKg(
  beforeKg: number,
  stepKg: number,
  smallestIncrementKg: number,
  unit: WeightUnit
): number | null {
  const increment = fromKg(smallestIncrementKg, unit);
  const jump =
    Math.floor(fromKg(stepKg, unit) / 2 / increment + 1e-9) * increment;
  if (jump <= 0) return null;
  return toKg(Number((fromKg(beforeKg, unit) + jump).toFixed(4)), unit);
}

const NO_SET: PlannedSet = {
  weightKg: null,
  reps: null,
  rpe: null,
  logged: false,
  target: null,
};

const NO_FLAGS = {
  effortNotChecked: false,
  effortBlocked: false,
  plateau: false,
  repRangeChanged: false,
};

function firstPlan(input: OverloadInput): OverloadPlan {
  if (input.routineSetTargets.length === 0) {
    return { reason: 'baseline', sets: [], ...NO_FLAGS };
  }
  return {
    reason: 'routine-target',
    sets: Array.from({ length: input.plannedSets }, (_, index) => ({
      weightKg: input.startingWeightKg,
      reps:
        input.routineSetTargets[index] ??
        input.routineSetTargets.at(-1) ??
        input.repRange.min,
    })),
    ...NO_FLAGS,
  };
}

/**
 * Per-Set Overload targets from the member's own history (locked rules).
 * Only strength and bodyweight Exercises get targets; with no history there's
 * only a baseline, or the Routine's per-Set targets.
 */
export function overloadTargets(input: OverloadInput): OverloadPlan | null {
  if (
    input.exerciseType !== 'strength' &&
    input.exerciseType !== 'bodyweight'
  ) {
    return null;
  }
  const [last, beforeLast, beforeIncrease] = input.exposures;
  if (!last) return firstPlan(input);

  const { min, max } = input.repRange;
  const planned = last.plannedSets.slice(0, input.plannedSets);
  const lastOf = (sets: PlannedSet[], index: number) => {
    const set = sets[index] ?? sets.at(-1);
    return set && (set.logged || set.target)
      ? set
      : (sets.findLast((item) => item.logged) ?? NO_SET);
  };
  const clampReps = (reps: number) => Math.min(Math.max(reps, min), max);
  const everySetAtTop =
    planned.length === input.plannedSets &&
    planned.every(
      (set) =>
        set.logged &&
        (set.reps ?? 0) >= max &&
        (set.target === null || meetsTarget(set, set.target))
    );
  const effortAllows = planned.every(
    (set) => set.rpe === null || set.rpe <= MAX_PASSING_RPE
  );
  const flags = {
    effortNotChecked: planned.some((set) => set.logged && set.rpe === null),
    effortBlocked: everySetAtTop && !effortAllows,
    plateau:
      input.exposures.length >= PLATEAU_STALLS &&
      input.exposures.slice(0, PLATEAU_STALLS).every((item) => item.stalled) &&
      !last.plateauDismissed,
    repRangeChanged: last.repRange.min !== min || last.repRange.max !== max,
  };
  const plan = (
    reason: OverloadReason,
    target: (index: number) => SetTarget
  ): OverloadPlan => ({
    reason,
    sets: Array.from({ length: input.plannedSets }, (_, index) =>
      target(index)
    ),
    ...flags,
  });
  const repProgression = () =>
    plan('rep-progression', (index) => {
      const set = lastOf(planned, index);
      if (set.target && (!set.logged || !meetsTarget(set, set.target))) {
        return {
          weightKg: set.target.weightKg,
          reps: clampReps(set.target.reps),
        };
      }
      return {
        weightKg: set.weightKg,
        reps: clampReps((set.reps ?? min - 1) + 1),
      };
    });

  // A Rep range change keeps the weight and clamps the reps.
  if (flags.repRangeChanged) return repProgression();

  const belowRange = planned.some((set) => set.logged && (set.reps ?? 0) < min);
  // A second miss below the range after an increase: a smaller jump from the
  // weight before the increase.
  if (
    belowRange &&
    last.reason === 'hold-below-range' &&
    beforeLast?.reason === 'weight-increase' &&
    beforeIncrease
  ) {
    const before = beforeIncrease.plannedSets.slice(0, input.plannedSets);
    const jumped = Array.from({ length: input.plannedSets }, (_, index) => {
      const weightKg = lastOf(before, index).weightKg;
      return weightKg === null
        ? null
        : smallerJumpKg(
            weightKg,
            input.stepKg,
            input.smallestIncrementKg,
            input.unit
          );
    });
    if (jumped.every((weightKg) => weightKg !== null)) {
      return plan('smaller-jump', (index) => ({
        weightKg: jumped[index] ?? null,
        reps: min,
      }));
    }
  }
  // Below the range after an increase: hold the weight, aim for the bottom.
  if (
    belowRange &&
    (last.reason === 'weight-increase' || last.reason === 'hold-below-range')
  ) {
    return plan('hold-below-range', (index) => ({
      weightKg:
        lastOf(planned, index).target?.weightKg ??
        lastOf(planned, index).weightKg,
      reps: min,
    }));
  }

  if (everySetAtTop && effortAllows) {
    return plan('weight-increase', (index) => {
      // Bodyweight progresses to added load once the range is maxed.
      const weightKg =
        lastOf(planned, index).weightKg ??
        (input.exerciseType === 'bodyweight' ? 0 : null);
      return {
        weightKg:
          weightKg === null
            ? null
            : increasedWeightKg(weightKg, input.stepKg, input.unit),
        reps: min,
      };
    });
  }

  return repProgression();
}
