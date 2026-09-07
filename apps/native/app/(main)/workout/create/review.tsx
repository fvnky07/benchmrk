import { Button, ListItem, Text } from '@expo/ui';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import {
  type ExerciseSummary,
  exercisesApi,
  useWorkoutStore,
  workoutExercisesApi,
  workoutsApi,
} from '@/lib';

export default function ReviewWorkoutScreen() {
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const exercises = useQuery(exercisesApi.listExercises);
  const createWorkout = useMutation(workoutsApi.createWorkout);
  const addExercisesToWorkout = useMutation(
    workoutExercisesApi.addExercisesToWorkout
  );
  const title = useWorkoutStore((state) => state.title);
  const selectedExerciseIds = useWorkoutStore(
    (state) => state.selectedExerciseIds
  );
  const exerciseConfigs = useWorkoutStore((state) => state.exerciseConfigs);
  const reset = useWorkoutStore((state) => state.reset);
  const selectedExercises = (exercises ?? []).filter(
    (exercise: ExerciseSummary) => selectedExerciseIds.includes(exercise._id)
  );

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      const workoutId = await createWorkout({ name: title });
      await addExercisesToWorkout({
        workoutId,
        exercises: selectedExercises.map((exercise: ExerciseSummary) => {
          const config = exerciseConfigs[exercise._id] ?? {
            sets: 3,
            reps: 10,
            weight: 0,
          };

          return {
            exerciseId: exercise._id,
            sets: config.sets,
            reps: config.reps,
            weight: config.weight,
          };
        }),
      });
      reset();
      router.replace('/workout');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed.';
      setErrorMessage(
        message.includes('FREE_TIER_LIMIT')
          ? 'Workout limit reached. Free users can store up to 3 workouts.'
          : message
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (exercises === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>Loading workout summary…</Text>
      </NativeScreen>
    );
  }

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        Review workout
      </Text>
      <ListItem supportingText={title || 'Untitled workout'}>
        Workout name
      </ListItem>
      {selectedExercises.map((exercise: ExerciseSummary) => {
        const config = exerciseConfigs[exercise._id] ?? {
          sets: 3,
          reps: 10,
          weight: 0,
        };

        return (
          <ListItem
            key={exercise._id}
            supportingText={`${config.sets} sets · ${config.reps} reps · ${config.weight} kg`}
          >
            {exercise.name}
          </ListItem>
        );
      })}
      {selectedExercises.length === 0 ? (
        <ListItem supportingText="Return to exercise selection and choose at least one movement.">
          No exercises selected
        </ListItem>
      ) : null}
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>
          Could not save workout
        </ListItem>
      ) : null}
      <Button
        disabled={
          isSaving || title.length === 0 || selectedExercises.length === 0
        }
        label={isSaving ? 'Saving workout…' : 'Save workout'}
        onPress={handleSave}
      />
    </NativeScreen>
  );
}
