export const RECONNECTING_AFTER_MS = 30_000;
export const DROPPED_AFTER_MS = 600_000;
export const IDLE_END_AFTER_MS = 4 * 3_600_000;

export function presenceOf(
  lastSeenAt: number,
  now: number
): 'active' | 'reconnecting' {
  return now - lastSeenAt >= RECONNECTING_AFTER_MS ? 'reconnecting' : 'active';
}
