import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

/** Opens the Workout in progress once when the app launches. */
export function useResumeActiveWorkout() {
  const activeWorkout = useQuery(api.workouts.getActive);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current || activeWorkout === undefined) return;
    hasChecked.current = true;
    if (activeWorkout) router.push('/workout/active');
  }, [activeWorkout]);
}
