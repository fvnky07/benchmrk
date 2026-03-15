import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ActiveSessionState {
  // Persisted (crash recovery — survives app kill)
  activeSessionId: string | null;
  sessionStartTimestamp: number | null; // Date.now() when session started — timer source of truth
  sessionName: string;
  // Non-persisted UI state
  currentExerciseIndex: number;
}

interface ActiveSessionActions {
  startSession: (
    sessionId: string,
    name: string,
    startTimestamp: number
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
      currentExerciseIndex: 0,

      startSession: (sessionId, name, startTimestamp) =>
        set({
          activeSessionId: sessionId,
          sessionStartTimestamp: startTimestamp,
          sessionName: name,
          currentExerciseIndex: 0,
        }),

      endSession: () =>
        set({
          activeSessionId: null,
          sessionStartTimestamp: null,
          sessionName: '',
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
      }),
    }
  )
);
