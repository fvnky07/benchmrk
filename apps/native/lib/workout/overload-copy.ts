import type { EffortScale } from '@repo/backend/convex/domain/effort';
import type {
  OverloadReason,
  RepRange,
} from '@repo/backend/convex/domain/overload';

/** What a Workout Exercise's targets are based on, as the backend saved it. */
export type OverloadBasis = {
  reason: OverloadReason;
  effortNotChecked: boolean;
  effortBlocked: boolean;
  plateau: boolean;
  repRangeChanged: boolean;
  edited: boolean;
  declined: boolean;
};

/** The effort gate for a weight increase, in the member's scale. */
const EFFORT_GATE: Record<EffortScale, string> = {
  RPE: 'RPE 9 or lower',
  RIR: 'RIR 1 or more',
};

const RULE = (range: RepRange, scale: EffortScale) =>
  `Weight goes up only when every Working Set reaches ${range.max} reps, the top of the Rep range, at ${EFFORT_GATE[scale]}.`;

const WHY: Record<
  OverloadReason,
  (range: RepRange, scale: EffortScale) => string
> = {
  baseline: () =>
    'No history for this Exercise yet, so there’s no Overload target. Log it once and your next Workout gets one.',
  'routine-target': () =>
    'These are your Routine’s targets for each Set. After your first completed Workout, targets come from what you logged.',
  'rep-progression': (range, scale) =>
    `${RULE(range, scale)} Until then each Set aims for its reps from last time + 1, capped at ${range.max}.`,
  'weight-increase': (range, scale) =>
    `Every Working Set reached ${range.max} reps at ${EFFORT_GATE[scale]}, so the weight goes up one step and reps start again at ${range.min}.`,
  'hold-below-range': (range) =>
    `A Set fell below ${range.min} reps after the weight went up, so the weight holds and each Set aims for ${range.min}.`,
  'smaller-jump': (range) =>
    `Sets fell below ${range.min} reps twice after the weight went up, so this is a smaller jump: half a step, rounded down to your smallest increment.`,
};

/** Why: the rule behind the suggestion. */
export function whyText(
  basis: OverloadBasis,
  range: RepRange,
  scale: EffortScale
): string {
  if (basis.repRangeChanged) {
    return `Your Rep range changed, so the weight stays and each Set’s reps are kept within ${range.min}–${range.max}.`;
  }
  if (basis.effortBlocked) {
    return `Every Working Set reached ${range.max} reps, but at least one was harder than ${EFFORT_GATE[scale]}, so the weight holds. ${RULE(range, scale)}`;
  }
  return WHY[basis.reason](range, scale);
}

/** Shown when Sets last time had no Effort rating and counted as passing. */
export function effortNotCheckedText(unrated: number, total: number): string {
  return `Effort not checked on ${unrated} of ${total} Sets last time, so they counted as passing.`;
}

export const PLATEAU_TEXT =
  'Plateau: your last three Workouts with this Exercise missed the target. Consider a deload, about 10% lighter, or a wider Rep range. Nothing changes unless you change it.';

export const TIMED_TEXT =
  'Timed and cardio Exercises show your previous Set instead of a target.';
