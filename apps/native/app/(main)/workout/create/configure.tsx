import { Button, ListItem, Text } from '@expo/ui';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';

import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import {
  type ExerciseSummary,
  exerciseConfigSchema,
  exercisesApi,
  useWorkoutStore,
} from '@/lib';

export default function ConfigureWorkoutScreen() {
  const selectedExerciseIds = useWorkoutStore(
    (state) => state.selectedExerciseIds
  );
  const exerciseConfigs = useWorkoutStore((state) => state.exerciseConfigs);
  const setExerciseConfig = useWorkoutStore((state) => state.setExerciseConfig);
  const exercises = useQuery(exercisesApi.listExercises);

  const selectedExercises = (exercises ?? []).filter(
    (exercise: ExerciseSummary) => selectedExerciseIds.includes(exercise._id)
  );
  const canReview =
    selectedExercises.length > 0 &&
    selectedExercises.every(
      (exercise: ExerciseSummary) =>
        exerciseConfigSchema.safeParse(
          exerciseConfigs[exercise._id] ?? { sets: 3, reps: 10, weight: 0 }
        ).success
    );

  const handleNumberChange = (
    exerciseId: string,
    field: 'sets' | 'reps' | 'weight',
    value: string
  ) => {
    const previous = exerciseConfigs[exerciseId] ?? {
      sets: 3,
      reps: 10,
      weight: 0,
    };
    const parsed = Number(value || 0);

    setExerciseConfig(exerciseId, {
      ...previous,
      [field]: Number.isNaN(parsed) ? 0 : parsed,
    });
  };

  if (exercises === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>Loading selected exercises…</Text>
      </NativeScreen>
    );
  }

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        Configure exercises
      </Text>
      <Text textStyle={{ fontSize: 17 }}>
        Set the initial sets, reps, and weight for each movement.
      </Text>
      {selectedExercises.map((exercise: ExerciseSummary) => {
        const config = exerciseConfigs[exercise._id] ?? {
          sets: 3,
          reps: 10,
          weight: 0,
        };

        return (
          <NativeScreenSection key={exercise._id} title={exercise.name}>
            <NativeTextField
              keyboardType="number-pad"
              label="Sets"
              onChangeText={(value) =>
                handleNumberChange(exercise._id, 'sets', value)
              }
              value={String(config.sets)}
            />
            <NativeTextField
              keyboardType="number-pad"
              label="Reps"
              onChangeText={(value) =>
                handleNumberChange(exercise._id, 'reps', value)
              }
              value={String(config.reps)}
            />
            <NativeTextField
              keyboardType="decimal-pad"
              label="Weight (kg)"
              onChangeText={(value) =>
                handleNumberChange(exercise._id, 'weight', value)
              }
              value={String(config.weight)}
            />
          </NativeScreenSection>
        );
      })}
      {selectedExercises.length === 0 ? (
        <ListItem supportingText="Return to the previous screen and select at least one exercise.">
          No exercises selected
        </ListItem>
      ) : null}
      <Button
        disabled={!canReview}
        label="Review workout"
        onPress={() => router.push('/workout/create/review')}
      />
    </NativeScreen>
  );
}

function NativeScreenSection({
  children,
  title,
}: Readonly<{
  children: React.ReactNode;
  title: string;
}>) {
  return (
    <>
      <ListItem>{title}</ListItem>
      {children}
    </>
  );
}
