import { Button, ListItem, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { TrendCard } from '@/components/charts/trend-card';
import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { ExercisePicker } from '@/components/workout/exercise-picker';
import { RoutineExerciseEditor } from '@/components/workout/routine-exercise-editor';
import { formatWeight, parseWholeNumber } from '@/lib/workout/format';
import { useStartWorkout } from '@/lib/workout/use-start-workout';

export default function RoutineBuilderScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const routineId = params.id as Id<'routines'>;
  const routine = useQuery(api.routines.get, { routineId });
  const trends = useQuery(
    api.trends.forRoutine,
    routine ? { routineId } : 'skip'
  );
  const settings = useQuery(api.memberSettings.get);
  const rename = useMutation(api.routines.rename);
  const setTargetDuration = useMutation(api.routines.setTargetDuration);
  const addExercise = useMutation(api.routines.addExercise);
  const removeRoutine = useMutation(api.routines.remove);
  const startWorkout = useStartWorkout();
  const [name, setName] = useState('');
  const [targetMinutes, setTargetMinutes] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!routine) return;
    setName(routine.name);
    setTargetMinutes(
      routine.targetDurationSeconds === null
        ? ''
        : String(Math.round(routine.targetDurationSeconds / 60))
    );
  }, [routine]);

  if (routine === undefined || settings === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>Loading Routine…</Text>
      </NativeScreen>
    );
  }

  if (routine === null || settings === null) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
          Routine not found
        </Text>
      </NativeScreen>
    );
  }

  const attempt = async (action: () => Promise<unknown>, failure: string) => {
    try {
      setErrorMessage(null);
      await action();
    } catch {
      setErrorMessage(failure);
    }
  };

  const minutes = parseWholeNumber(targetMinutes);
  const nextTargetSeconds =
    targetMinutes.trim() === ''
      ? null
      : minutes !== null && minutes > 0
        ? minutes * 60
        : undefined;
  return (
    <NativeScreen>
      <NativeTextField label="Name" value={name} onChangeText={setName} />
      {name.trim() && name.trim() !== routine.name ? (
        <Button
          label="Save name"
          onPress={() =>
            attempt(
              () => rename({ routineId, name }),
              'Could not rename this Routine.'
            )
          }
        />
      ) : null}
      <Button
        disabled={routine.exercises.length === 0}
        label="Start Workout"
        onPress={() =>
          attempt(
            () => startWorkout(routineId),
            'Could not start this Workout.'
          )
        }
      />
      <Text textStyle={{ fontSize: 20, fontWeight: '600' }}>Exercises</Text>
      {routine.exercises.length === 0 ? (
        <ListItem supportingText="Add the Exercises you plan to do, in order.">
          No Exercises yet
        </ListItem>
      ) : (
        routine.exercises.map((exercise, index) => (
          <ListItem
            key={exercise._id}
            onPress={() => setEditingIndex(index)}
            supportingText={[
              exercise.blockId !== null
                ? `Alternating sets · rest ${routine.blocks.find((item) => item._id === exercise.blockId)?.restSeconds ?? exercise.restSeconds} s after each round`
                : null,
              `${exercise.targetSets} Sets`,
              exercise.type === 'strength' || exercise.type === 'bodyweight'
                ? `${exercise.repRangeMin}–${exercise.repRangeMax} reps`
                : null,
              exercise.startingWeightKg === null
                ? null
                : `from ${formatWeight(exercise.startingWeightKg, settings.units)}`,
              exercise.blockId === null
                ? `rest ${exercise.restSeconds} s`
                : null,
              exercise.linkedToNext ? 'alternates with the next' : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          >
            {exercise.name}
          </ListItem>
        ))
      )}
      <Button
        label="Add Exercise"
        variant="outlined"
        onPress={() => setIsPickerOpen(true)}
      />
      <NativeTextField
        label="Target duration (minutes)"
        keyboardType="number-pad"
        placeholder={
          routine.suggestedDurationSeconds === null
            ? 'Suggested after 3 Workouts'
            : `${Math.round(routine.suggestedDurationSeconds / 60)} from your recent Workouts`
        }
        value={targetMinutes}
        onChangeText={setTargetMinutes}
      />
      {nextTargetSeconds !== undefined &&
      nextTargetSeconds !== routine.targetDurationSeconds ? (
        <Button
          label="Save target duration"
          onPress={() =>
            attempt(
              () =>
                setTargetDuration({
                  routineId,
                  targetDurationSeconds: nextTargetSeconds,
                }),
              'Could not save the target duration.'
            )
          }
        />
      ) : null}
      {trends === undefined ? (
        <Text>Loading trends…</Text>
      ) : (
        <TrendCard duration={trends.duration} rest={trends.rest} />
      )}
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Something went wrong</ListItem>
      ) : null}
      {isConfirmingDelete ? (
        <>
          <ListItem supportingText="Past Workouts keep their Sets.">
            Delete this Routine?
          </ListItem>
          <Button
            label="Delete Routine"
            onPress={() =>
              attempt(async () => {
                await removeRoutine({ routineId });
                router.back();
              }, 'Could not delete this Routine.')
            }
          />
          <Button
            label="Cancel"
            variant="outlined"
            onPress={() => setIsConfirmingDelete(false)}
          />
        </>
      ) : (
        <Button
          label="Delete Routine"
          variant="text"
          onPress={() => setIsConfirmingDelete(true)}
        />
      )}
      <ExercisePicker
        isPresented={isPickerOpen}
        onDismiss={() => setIsPickerOpen(false)}
        onPick={(exerciseId) => {
          setIsPickerOpen(false);
          attempt(
            () => addExercise({ routineId, exerciseId }),
            'Could not add this Exercise.'
          );
        }}
      />
      <RoutineExerciseEditor
        routineExercise={
          editingIndex === null
            ? null
            : (routine.exercises[editingIndex] ?? null)
        }
        position={editingIndex ?? 0}
        exerciseCount={routine.exercises.length}
        nextExercise={
          editingIndex === null
            ? null
            : (routine.exercises[editingIndex + 1] ?? null)
        }
        block={
          routine.blocks.find(
            (item) =>
              editingIndex !== null &&
              item._id === routine.exercises[editingIndex]?.blockId
          ) ?? null
        }
        units={settings.units}
        onDismiss={() => setEditingIndex(null)}
      />
    </NativeScreen>
  );
}
