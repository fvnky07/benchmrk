import { create } from 'zustand';

interface ExerciseConfig {
  sets: number;
  reps: number;
  weight: number;
}

interface WorkoutCreationStore {
  title: string;
  selectedExerciseIds: string[];
  exerciseConfigs: Record<string, ExerciseConfig>;
  setTitle: (title: string) => void;
  toggleExercise: (id: string) => void;
  setExerciseConfig: (id: string, config: ExerciseConfig) => void;
  reset: () => void;
}

export const useWorkoutStore = create<WorkoutCreationStore>((set) => ({
  title: '',
  selectedExerciseIds: [],
  exerciseConfigs: {},
  setTitle: (title) => set({ title }),
  toggleExercise: (id) =>
    set((state) => ({
      selectedExerciseIds: state.selectedExerciseIds.includes(id)
        ? state.selectedExerciseIds.filter((eid) => eid !== id)
        : [...state.selectedExerciseIds, id],
    })),
  setExerciseConfig: (id, config) =>
    set((state) => ({
      exerciseConfigs: {
        ...state.exerciseConfigs,
        [id]: config,
      },
    })),
  reset: () =>
    set({
      title: '',
      selectedExerciseIds: [],
      exerciseConfigs: {},
    }),
}));
