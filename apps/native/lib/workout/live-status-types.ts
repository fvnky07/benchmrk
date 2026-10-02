/**
 * What the Workout's live status shows on the Lock Screen: never an Exercise
 * or Routine name, never buttons.
 */
export type WorkoutLiveStatus = {
  startedAt: number;
  setsDone: number;
  setsPlanned: number;
  /** The running rest; null when not resting. */
  rest: { startedAt: number; endsAt: number } | null;
  /** Where a tap goes: the active Workout. */
  url: string;
};
