import {
  BottomSheet,
  Button,
  Checkbox,
  Column,
  ListItem,
  Row,
  Spacer,
  Text,
} from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { ExercisePicker } from '@/components/workout/exercise-picker';
import { ExerciseStrip } from '@/components/workout/exercise-strip';
import { QuickActionRow } from '@/components/workout/quick-action-row';
import { SetValueField } from '@/components/workout/set-value-field';
import { WorkoutProgress } from '@/components/workout/workout-progress';
import { useHaptics } from '@/lib/haptics';
import {
  formatClock,
  parseWeightKg,
  parseWholeNumber,
  weightInUnit,
} from '@/lib/workout/format';
import { useNow } from '@/lib/workout/use-now';

type Draft = { weight?: string; reps?: string };

export default function ActiveWorkoutScreen() {
  const workout = useQuery(api.workouts.getActive);
  const settings = useQuery(api.memberSettings.get);
  const completeSet = useMutation(api.workouts.completeSet);
  const uncompleteSet = useMutation(api.workouts.uncompleteSet);
  const updateSet = useMutation(api.workouts.updateSet);
  const addSet = useMutation(api.workouts.addSet);
  const addExercise = useMutation(api.workouts.addExercise);
  const endWorkout = useMutation(api.workouts.end);
  const haptic = useHaptics();
  const now = useNow();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isConfirmingTerminate, setIsConfirmingTerminate] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (workout === undefined || settings === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>Loading Workout…</Text>
      </NativeScreen>
    );
  }

  if (workout === null || settings === null) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
          No Workout in progress
        </Text>
        <Button label="Back to Workouts" onPress={() => router.back()} />
      </NativeScreen>
    );
  }

  const { units } = settings;
  const firstUnfinished = workout.exercises.findIndex((exercise) =>
    exercise.sets.some((set) => set.completedAt === null)
  );
  const index = Math.min(
    selectedIndex ?? Math.max(firstUnfinished, 0),
    Math.max(workout.exercises.length - 1, 0)
  );
  const exercise = workout.exercises[index];
  const currentSetIndex = exercise
    ? exercise.sets.findIndex((set) => set.completedAt === null)
    : -1;
  const allDone =
    workout.progress.total > 0 &&
    workout.progress.done === workout.progress.total;

  const attempt = async (action: () => Promise<unknown>, failure: string) => {
    try {
      setErrorMessage(null);
      await action();
    } catch {
      setErrorMessage(failure);
    }
  };

  const valuesOf = (set: NonNullable<typeof exercise>['sets'][number]) => {
    const draft = drafts[set._id] ?? {};
    const weight =
      draft.weight ??
      (set.weightKg === null ? '' : String(weightInUnit(set.weightKg, units)));
    const reps = draft.reps ?? (set.reps === null ? '' : String(set.reps));
    return { weight, reps };
  };

  const parsedValues = (weight: string, reps: string) => ({
    weightKg: parseWeightKg(weight, units) ?? undefined,
    reps: parseWholeNumber(reps) ?? undefined,
  });

  const setDraft = (setId: string, change: Draft) =>
    setDrafts((current) => ({
      ...current,
      [setId]: { ...current[setId], ...change },
    }));

  const end = (reason: 'finish' | 'terminate') =>
    attempt(async () => {
      if (reason === 'terminate') haptic('destructive-confirmation');
      await endWorkout({ workoutId: workout._id, reason });
      router.replace(`/workout/finished/${workout._id}`);
    }, 'Could not end this Workout. Try again.');

  return (
    <NativeScreen>
      <Row spacing={12} alignment="center">
        <Button
          label="Workout menu"
          variant="text"
          onPress={() => setIsMenuOpen(true)}
        />
        <Column spacing={2}>
          <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
            {workout.name}
          </Text>
          <Text textStyle={{ fontSize: 15 }}>
            {formatClock((now - workout.startedAt) / 1000)}
          </Text>
        </Column>
        <Spacer />
        <Button
          label="Terminate"
          variant="text"
          onPress={() => setIsConfirmingTerminate(true)}
        />
      </Row>
      <Row spacing={12} alignment="center">
        <Column style={{ width: 260 }}>
          <WorkoutProgress
            fraction={
              workout.progress.total === 0
                ? 0
                : workout.progress.done / workout.progress.total
            }
          />
        </Column>
        <Text textStyle={{ fontSize: 14 }}>
          {`${workout.progress.done}/${workout.progress.total} Sets`}
        </Text>
      </Row>
      {isConfirmingTerminate ? (
        <Column spacing={8}>
          <ListItem
            supportingText={`${workout.progress.done} of ${workout.progress.total} planned Sets are logged. Logged Sets are kept.`}
          >
            Terminate this Workout?
          </ListItem>
          <Button label="Terminate Workout" onPress={() => end('terminate')} />
          <Button
            label="Keep going"
            variant="outlined"
            onPress={() => setIsConfirmingTerminate(false)}
          />
        </Column>
      ) : null}
      <ExerciseStrip
        exercises={workout.exercises.map((item) => ({
          key: item._id,
          name: item.name,
          sets: item.sets.map((set) => ({ done: set.completedAt !== null })),
        }))}
        selectedIndex={index}
        onSelect={setSelectedIndex}
        onAdd={() => setIsPickerOpen(true)}
      />
      {exercise ? (
        <>
          <Row spacing={8} alignment="center">
            <Column spacing={2}>
              <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>
                {exercise.name}
              </Text>
              <Text textStyle={{ fontSize: 15 }}>
                {currentSetIndex === -1
                  ? `All ${exercise.sets.length} Sets logged`
                  : `Set ${currentSetIndex + 1} of ${exercise.sets.length}`}
              </Text>
            </Column>
            <Spacer />
          </Row>
          <QuickActionRow
            actions={settings.quickActions}
            handlers={{
              addSet: () =>
                attempt(
                  () => addSet({ workoutExerciseId: exercise._id }),
                  'Could not add a Set.'
                ),
              info: () => router.push(`/workout/exercise/${exercise.slug}`),
            }}
          />
          <Row spacing={8} alignment="center">
            <Text textStyle={{ fontSize: 13, fontWeight: '600' }}>Set</Text>
            <Spacer />
            <Text textStyle={{ fontSize: 13, fontWeight: '600' }}>{units}</Text>
            <Text textStyle={{ fontSize: 13, fontWeight: '600' }}>Reps</Text>
            <Text textStyle={{ fontSize: 13, fontWeight: '600' }}>Done</Text>
          </Row>
          {exercise.sets.map((set, setIndex) => {
            const { weight, reps } = valuesOf(set);
            const done = set.completedAt !== null;
            const saveDraft = () =>
              attempt(
                () =>
                  updateSet({ setId: set._id, ...parsedValues(weight, reps) }),
                'Could not save this Set.'
              );
            return (
              <Row key={set._id} spacing={8} alignment="center">
                <Text textStyle={{ fontSize: 17, fontWeight: '600' }}>
                  {String(setIndex + 1)}
                </Text>
                <Spacer />
                <SetValueField
                  keyboardType="decimal-pad"
                  placeholder={units}
                  value={weight}
                  onChangeText={(text) => setDraft(set._id, { weight: text })}
                  onBlur={saveDraft}
                />
                <SetValueField
                  keyboardType="number-pad"
                  placeholder="reps"
                  width={56}
                  value={reps}
                  onChangeText={(text) => setDraft(set._id, { reps: text })}
                  onBlur={saveDraft}
                />
                <Checkbox
                  value={done}
                  onValueChange={(checked) =>
                    attempt(async () => {
                      if (checked) {
                        await completeSet({
                          setId: set._id as Id<'sets'>,
                          ...parsedValues(weight, reps),
                        });
                        haptic('set-completed');
                      } else {
                        await uncompleteSet({ setId: set._id });
                      }
                    }, 'Could not update this Set.')
                  }
                />
              </Row>
            );
          })}
        </>
      ) : (
        <ListItem supportingText="Add an Exercise from the strip above to start logging Sets.">
          No Exercises yet
        </ListItem>
      )}
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Something went wrong</ListItem>
      ) : null}
      {allDone ? (
        <Button label="Finish Workout" onPress={() => end('finish')} />
      ) : null}
      <BottomSheet
        isPresented={isMenuOpen}
        onDismiss={() => setIsMenuOpen(false)}
      >
        <Column spacing={12}>
          <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
            Workout menu
          </Text>
          <Button
            label="Add Exercise"
            onPress={() => {
              setIsMenuOpen(false);
              setIsPickerOpen(true);
            }}
          />
          {allDone ? (
            <Button
              label="Finish Workout"
              onPress={() => {
                setIsMenuOpen(false);
                end('finish');
              }}
            />
          ) : null}
          <Button
            label="Terminate Workout"
            variant="text"
            onPress={() => {
              setIsMenuOpen(false);
              setIsConfirmingTerminate(true);
            }}
          />
          <Button
            label="Keep going"
            variant="outlined"
            onPress={() => setIsMenuOpen(false)}
          />
        </Column>
      </BottomSheet>
      <ExercisePicker
        isPresented={isPickerOpen}
        onDismiss={() => setIsPickerOpen(false)}
        onPick={(exerciseId) => {
          setIsPickerOpen(false);
          attempt(async () => {
            await addExercise({ workoutId: workout._id, exerciseId });
            setSelectedIndex(workout.exercises.length);
          }, 'Could not add this Exercise.');
        }}
      />
    </NativeScreen>
  );
}
