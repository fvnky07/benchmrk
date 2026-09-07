import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL ?? null;

interface ActiveSessionState {
  // Persisted (crash recovery — survives app kill)
  activeSessionId: string | null;
  sessionStartTimestamp: number | null; // Date.now() when session started — timer source of truth
  sessionName: string;
  workoutTemplateId: string | null;
  convexUrl: string | null;
  // Non-persisted UI state
  currentExerciseIndex: number;
}

interface ActiveSessionActions {
  startSession: (
    sessionId: string,
    name: string,
    startTimestamp: number,
    workoutTemplateId: string
  ) => void;
  endSession: () => void;
  setCurrentExerciseIndex: (index: number) => void;
}

type ActiveSessionStore = ActiveSessionState & ActiveSessionActions;

export const useActiveSessionStore = create<ActiveSessionStore>()(
  persist(
    (set) => ({
      activeSessionId: null,
      sessionStartTimestamp: null,
      sessionName: '',
      workoutTemplateId: null,
      convexUrl: null,
      currentExerciseIndex: 0,

      startSession: (sessionId, name, startTimestamp, workoutTemplateId) =>
        set({
          activeSessionId: sessionId,
          sessionStartTimestamp: startTimestamp,
          sessionName: name,
          workoutTemplateId,
          convexUrl: CONVEX_URL,
          currentExerciseIndex: 0,
        }),

      endSession: () =>
        set({
          activeSessionId: null,
          sessionStartTimestamp: null,
          sessionName: '',
          workoutTemplateId: null,
          convexUrl: null,
          currentExerciseIndex: 0,
        }),

      setCurrentExerciseIndex: (index) => set({ currentExerciseIndex: index }),
    }),
    {
      name: 'benchmrk-active-workout',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist crash-recovery fields — not UI state
      partialize: (state) => ({
        activeSessionId: state.activeSessionId,
        sessionStartTimestamp: state.sessionStartTimestamp,
        sessionName: state.sessionName,
        workoutTemplateId: state.workoutTemplateId,
        convexUrl: state.convexUrl,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.activeSessionId && state.convexUrl !== CONVEX_URL) {
          state.endSession();
        }
      },
    }
  )
);
