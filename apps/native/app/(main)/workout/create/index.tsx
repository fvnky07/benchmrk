import { Button, ListItem, Text } from '@expo/ui';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';

import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import {
  type ExerciseSummary,
  exercisesApi,
  useWorkoutStore,
  workoutNameSchema,
} from '@/lib';

export default function CreateWorkoutScreen() {
  const exercises = useQuery(exercisesApi.listExercises);
  const title = useWorkoutStore((state) => state.title);
  const selectedExerciseIds = useWorkoutStore(
    (state) => state.selectedExerciseIds
  );
  const setTitle = useWorkoutStore((state) => state.setTitle);
  const toggleExercise = useWorkoutStore((state) => state.toggleExercise);

  const canContinue =
    workoutNameSchema.safeParse(title).success &&
    selectedExerciseIds.length > 0;

  if (exercises === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>Loading exercises…</Text>
      </NativeScreen>
    );
  }

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        Name your workout
      </Text>
      <Text textStyle={{ fontSize: 17 }}>
        Choose a title and select the exercises to include.
      </Text>
      <NativeTextField
        label="Workout name"
        onChangeText={setTitle}
        placeholder="Push Day A"
        value={title}
      />
      <ListItem supportingText={`${selectedExerciseIds.length} selected`}>
        Exercises
      </ListItem>
      {exercises.length === 0 ? (
        <ListItem supportingText="Seed the catalog before creating workouts.">
          No exercises available
        </ListItem>
      ) : (
        exercises.map((exercise: ExerciseSummary) => {
          const selected = selectedExerciseIds.includes(exercise._id);

          return (
            <ListItem
              key={exercise._id}
              supportingText={
                selected
                  ? `${exercise.description} Selected`
                  : exercise.description
              }
              onPress={() => toggleExercise(exercise._id)}
            >
              {exercise.name}
            </ListItem>
          );
        })
      )}
      <Button
        disabled={!canContinue}
        label="Configure exercises"
        onPress={() => router.push('/workout/create/configure')}
      />
    </NativeScreen>
  );
}
