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

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * Splits a Workout's time between its logged Sets. Measurement starts at the
 * first logged Set: its working time runs from its first touch, and nothing
 * before it counts. Each later Set works from its first touch (if it came
 * after the previous Set) or else from the end of the previous rest; the gap
 * before that is rest when it's the same Exercise or block, transition
 * otherwise. Sets logged together still count in totals but not in adherence.
 */
export function timeBreakdown(sets: readonly TimedSet[]): TimeBreakdown {
  const ordered = [...sets].sort((a, b) => a.completedAt - b.completedAt);
  let workingMs = 0;
  let restMs = 0;
  let transitionMs = 0;
  const rests: { actual: number; planned: number }[] = [];

  for (const [index, set] of ordered.entries()) {
    const previous = ordered[index - 1];
    if (!previous) {
      workingMs += set.completedAt - (set.firstTouchedAt ?? set.completedAt);
      continue;
    }
    const start =
      set.firstTouchedAt !== null && set.firstTouchedAt >= previous.completedAt
        ? set.firstTouchedAt
        : Math.min(
            previous.restAfter?.endsAt ?? previous.completedAt,
            set.completedAt
          );
    workingMs += set.completedAt - start;
    const gap = Math.max(0, start - previous.completedAt);
    const sameExercise = set.workoutExerciseId === previous.workoutExerciseId;
    const sameBlock = set.blockId !== null && set.blockId === previous.blockId;
    if (!sameExercise && !sameBlock) {
      transitionMs += gap;
      continue;
    }
    restMs += gap;
    if (previous.restAfter && !set.loggedTogether && !previous.loggedTogether) {
      rests.push({
        actual: gap / 1000,
        planned: previous.restAfter.plannedSeconds,
      });
    }
  }

  return {
    workingSeconds: Math.round(workingMs / 1000),
    restSeconds: Math.round(restMs / 1000),
    transitionSeconds: Math.round(transitionMs / 1000),
    adherence:
      rests.length === 0
        ? null
        : {
            actualSeconds: Math.round(
              average(rests.map((rest) => rest.actual))
            ),
            plannedSeconds: Math.round(
              average(rests.map((rest) => rest.planned))
            ),
          },
  };
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
