import {
  type ExerciseConfig,
  exerciseConfigSchema,
  workoutNameSchema,
} from './schemas';

export function canContinueFromSelection(
  title: string,
  selectedExerciseIds: string[]
) {
  return (
    workoutNameSchema.safeParse(title).success && selectedExerciseIds.length > 0
  );
}

export function canContinueFromConfiguration(
  selectedExerciseIds: string[],
  exerciseConfigs: Record<string, ExerciseConfig>
) {
  return (
    selectedExerciseIds.length > 0 &&
    selectedExerciseIds.every((exerciseId) => {
      const config = exerciseConfigs[exerciseId] ?? {
        sets: 3,
        reps: 10,
        weight: 0,
      };

      return exerciseConfigSchema.safeParse(config).success;
    })
  );
}

export function buildWorkoutExercisePayload(
  selectedExerciseIds: string[],
  exerciseConfigs: Record<string, ExerciseConfig>
) {
  return selectedExerciseIds.map((exerciseId) => {
    const config = exerciseConfigs[exerciseId] ?? {
      sets: 3,
      reps: 10,
      weight: 0,
    };

    return {
      exerciseId,
      sets: config.sets,
      reps: config.reps,
      weight: config.weight,
    };
  });
}
