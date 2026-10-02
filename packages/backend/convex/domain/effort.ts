export type EffortScale = 'RPE' | 'RIR';

const MAX_RPE = 10;
const MIN_RPE = 1;

/** The effort dots offered when rating a Set, hardest first, as RPE. */
export const EFFORT_DOT_RPES = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6] as const;

/** Effort is stored as RPE; RIR is its mirror (RIR = 10 − RPE). */
export function rpeFromEffort(value: number, scale: EffortScale): number {
  return scale === 'RPE' ? value : MAX_RPE - value;
}

/** A stored RPE in the scale the member reads and enters. */
export function effortInScale(rpe: number, scale: EffortScale): number {
  return scale === 'RPE' ? rpe : MAX_RPE - rpe;
}

/** RPE 1–10 in 0.5 steps (RIR 0–9). */
export function isValidRpe(rpe: number): boolean {
  return rpe >= MIN_RPE && rpe <= MAX_RPE && Number.isInteger(rpe * 2);
}
