import { LiveStatus } from '@/modules/benchmrk-ui';
import type { WorkoutLiveStatus } from './live-status-types';

/**
 * Keeps the ongoing Workout notification in step with the active Workout
 * (see WorkoutLiveStatus.kt): shown with it, updated as Sets complete and
 * rest starts or ends, cleared with it.
 */
export function syncLiveStatus(status: WorkoutLiveStatus | null) {
  if (!status) {
    LiveStatus?.clear();
    return;
  }
  LiveStatus?.show({
    startedAt: status.startedAt,
    setsDone: status.setsDone,
    setsPlanned: status.setsPlanned,
    restEndsAt: status.rest?.endsAt ?? null,
    url: status.url,
  });
}
