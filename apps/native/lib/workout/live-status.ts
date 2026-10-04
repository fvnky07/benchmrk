import type { WorkoutLiveStatus } from './live-status-types';

/** Only iOS and Android have a live status; elsewhere there's nothing to sync. */
export function syncLiveStatus(_status: WorkoutLiveStatus | null) {}
