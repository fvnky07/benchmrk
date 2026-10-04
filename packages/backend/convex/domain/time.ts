// Passive time measures from a Workout's recorded moments.

/** Sets completed within this long of each other were logged together. */
export const LOGGED_TOGETHER_MS = 10_000;

/** Target duration needs this many completed Workouts of the Routine. */
const TARGET_MIN_WORKOUTS = 3;
const TARGET_RECENT_WORKOUTS = 5;

/** A logged Set with the moments time tracking uses. */
export type TimedSet = {
  workoutExerciseId: string;
  /** Its Alternating sets block; null when it stands alone. */
  blockId: string | null;
  /** Its first edit; null when it was logged untouched. */
  firstTouchedAt: number | null;
  completedAt: number;
  /** The rest that started after it. */
  restAfter: { plannedSeconds: number; endsAt: number } | null;
  loggedTogether: boolean;
};

export type TimeBreakdown = {
  /** Working time is an estimate: first touch, or rest end, to completion. */
  workingSeconds: number;
  /** Gaps before the same Exercise or the same block. */
  restSeconds: number;
  /** Gaps before a different Exercise. */
  transitionSeconds: number;
  /** Average actual rest vs planned; never a score. Null with no rest. */
  adherence: { actualSeconds: number; plannedSeconds: number } | null;
};

type TimeTotals = {
  workingMs: number;
  restMs: number;
  transitionMs: number;
  actualRestSeconds: number;
  plannedRestSeconds: number;
  restSamples: number;
};

const emptyTotals = (): TimeTotals => ({
  workingMs: 0,
  restMs: 0,
  transitionMs: 0,
  actualRestSeconds: 0,
  plannedRestSeconds: 0,
  restSamples: 0,
});

/**
 * Each interval and rest sample belongs to the Set it ends at, including
 * transitions between Exercises and rest within an Alternating sets block.
 */
function walkTime(
  sets: readonly TimedSet[],
  visit: (set: TimedSet, interval: TimeTotals) => void
) {
  const ordered = [...sets].sort((a, b) => a.completedAt - b.completedAt);
  for (const [index, set] of ordered.entries()) {
    const interval = emptyTotals();
    const previous = ordered[index - 1];
    if (!previous) {
      interval.workingMs =
        set.completedAt - (set.firstTouchedAt ?? set.completedAt);
      visit(set, interval);
      continue;
    }
    const start =
      set.firstTouchedAt !== null && set.firstTouchedAt >= previous.completedAt
        ? set.firstTouchedAt
        : Math.min(
            previous.restAfter?.endsAt ?? previous.completedAt,
            set.completedAt
          );
    interval.workingMs = set.completedAt - start;
    const gap = Math.max(0, start - previous.completedAt);
    const sameExercise = set.workoutExerciseId === previous.workoutExerciseId;
    const sameBlock = set.blockId !== null && set.blockId === previous.blockId;
    if (!sameExercise && !sameBlock) {
      interval.transitionMs = gap;
    } else {
      interval.restMs = gap;
      if (
        previous.restAfter &&
        !set.loggedTogether &&
        !previous.loggedTogether
      ) {
        interval.actualRestSeconds = gap / 1000;
        interval.plannedRestSeconds = previous.restAfter.plannedSeconds;
        interval.restSamples = 1;
      }
    }
    visit(set, interval);
  }
}

function addTotals(total: TimeTotals, interval: TimeTotals) {
  total.workingMs += interval.workingMs;
  total.restMs += interval.restMs;
  total.transitionMs += interval.transitionMs;
  total.actualRestSeconds += interval.actualRestSeconds;
  total.plannedRestSeconds += interval.plannedRestSeconds;
  total.restSamples += interval.restSamples;
}

function breakdown(total: TimeTotals): TimeBreakdown {
  return {
    workingSeconds: Math.round(total.workingMs / 1000),
    restSeconds: Math.round(total.restMs / 1000),
    transitionSeconds: Math.round(total.transitionMs / 1000),
    adherence:
      total.restSamples === 0
        ? null
        : {
            actualSeconds: Math.round(
              total.actualRestSeconds / total.restSamples
            ),
            plannedSeconds: Math.round(
              total.plannedRestSeconds / total.restSamples
            ),
          },
  };
}

/**
 * Splits a Workout's time between its logged Sets. Measurement starts at the
 * first logged Set: its working time runs from its first touch, and nothing
 * before it counts. Each later Set works from its first touch (if it came
 * after the previous Set) or else from the end of the previous rest; the gap
 * before that is rest when it's the same Exercise or block, transition
 * otherwise. Sets logged together still count in totals but not in adherence.
 */
export function timeBreakdown(sets: readonly TimedSet[]): TimeBreakdown {
  const total = emptyTotals();
  walkTime(sets, (_set, interval) => addTotals(total, interval));
  return breakdown(total);
}

/** Per-Exercise measures whose rounded durations add up to the whole Workout. */
export function timeByExercise(
  sets: readonly TimedSet[]
): Record<string, TimeBreakdown> {
  const totals: Record<string, TimeTotals> = {};
  walkTime(sets, (set, interval) => {
    let total = totals[set.workoutExerciseId];
    if (total === undefined) {
      total = emptyTotals();
      totals[set.workoutExerciseId] = total;
    }
    addTotals(total, interval);
  });
  const result: Record<string, TimeBreakdown> = {};
  const cumulative = emptyTotals();
  for (const [exerciseId, total] of Object.entries(totals)) {
    const previous = breakdown(cumulative);
    addTotals(cumulative, total);
    const next = breakdown(cumulative);
    // Carry fractional seconds forward instead of rounding every Exercise
    // independently, which could otherwise disagree with the Workout total.
    result[exerciseId] = {
      ...breakdown(total),
      workingSeconds: next.workingSeconds - previous.workingSeconds,
      restSeconds: next.restSeconds - previous.restSeconds,
      transitionSeconds: next.transitionSeconds - previous.transitionSeconds,
    };
  }
  return result;
}

/**
 * A Routine's target duration: the member's override, or else the median of
 * its last 5 completed Workouts once 3 exist. `recentSeconds` is newest first.
 */
export function targetDuration(
  recentSeconds: readonly number[],
  overrideSeconds: number | null
): number | null {
  if (overrideSeconds !== null) return overrideSeconds;
  if (recentSeconds.length < TARGET_MIN_WORKOUTS) return null;
  const sorted = recentSeconds
    .slice(0, TARGET_RECENT_WORKOUTS)
    .sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[middle] ?? null)
    : Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
}
