import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

import { syncLiveStatus } from './live-status';

/**
 * Drives the Workout's live status (a Live Activity on iOS, an ongoing
 * notification on Android) from the active Workout: it starts with the
 * Workout, follows Sets and rest, and ends when the Workout finishes, is
 * terminated or abandoned, including when that happened while the app was
 * closed. Signing out ends it too.
 */
export function useWorkoutLiveStatus() {
  const workout = useQuery(api.workouts.getActive);
  const isLoaded = workout !== undefined;
  const startedAt = workout?.startedAt;
  const setsDone = workout?.progress.done ?? 0;
  const setsPlanned = workout?.progress.total ?? 0;
  const restStartedAt = workout?.rest?.startedAt;
  const restEndsAt = workout?.rest?.endsAt;

  // Mounted for the signed-in session only: leaving it (sign-out) ends it.
  useEffect(() => () => syncLiveStatus(null), []);

  useEffect(() => {
    if (!isLoaded) return;
    syncLiveStatus(
      startedAt === undefined
        ? null
        : {
            startedAt,
            setsDone,
            setsPlanned,
            rest:
              restStartedAt !== undefined && restEndsAt !== undefined
                ? { startedAt: restStartedAt, endsAt: restEndsAt }
                : null,
            url: Linking.createURL('/workout/active'),
          }
    );
  }, [isLoaded, startedAt, setsDone, setsPlanned, restStartedAt, restEndsAt]);
}
