/** "45 min" or "1 h 5 min". */
export function formatMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/**
 * Quiet pacing against the target duration at this point of the Workout:
 * "+3 min" when behind, "−2 min" when ahead, "On pace" within a minute.
 */
export function aheadBehind(
  elapsedSeconds: number,
  targetSeconds: number,
  fractionDone: number
): string {
  const minutes = Math.round(
    (elapsedSeconds - targetSeconds * fractionDone) / 60
  );
  if (minutes === 0) return 'On pace';
  return minutes > 0 ? `+${minutes} min` : `−${-minutes} min`;
}
