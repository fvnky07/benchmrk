import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * useWorkoutTimer — live elapsed timer using Date.now() delta
 * Survives navigation and app backgrounding via AppState reconciliation.
 * @param startTimestamp - Date.now() value when session started (null = not started)
 */
export function useWorkoutTimer(startTimestamp: number | null): {
  elapsedSeconds: number;
  formatted: string;
} {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    if (startTimestamp === null) return;
    setElapsedSeconds(Math.floor((Date.now() - startTimestamp) / 1000));
  }, [startTimestamp]);

  // Start/stop interval when startTimestamp changes
  useEffect(() => {
    if (startTimestamp === null) {
      setElapsedSeconds(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    tick(); // Immediate sync
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTimestamp, tick]);

  // AppState reconciliation — correct elapsed time after backgrounding
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else if (next === 'active' && startTimestamp !== null) {
        tick(); // Immediate correction
        intervalRef.current = setInterval(tick, 1000);
      }
    });
    return () => sub.remove();
  }, [startTimestamp, tick]);

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { elapsedSeconds, formatted };
}
