import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation } from 'convex/react';
import { router } from 'expo-router';
import { useCallback } from 'react';

import { errorCode } from './format';

/**
 * Starts a Workout (from a Routine or empty) and opens it. If one is already
 * in progress, that one opens instead, because only one can be active.
 */
export function useStartWorkout(): (
  routineId?: Id<'routines'>
) => Promise<void> {
  const start = useMutation(api.workouts.start);
  return useCallback(
    async (routineId?: Id<'routines'>) => {
      try {
        await start({ routineId });
      } catch (error) {
        if (errorCode(error) !== 'ACTIVE_WORKOUT_EXISTS') throw error;
      }
      router.push('/workout/active');
    },
    [start]
  );
}
