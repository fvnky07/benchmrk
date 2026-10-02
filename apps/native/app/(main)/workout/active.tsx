import { Button, Column, ListItem, Row, Spacer, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { router } from 'expo-router';
import { useState } from 'react';

import { DockedScreen } from '@/components/native/docked-screen';
import { NativeScreen } from '@/components/native/native-screen';
import { ExercisePicker } from '@/components/workout/exercise-picker';
import { ExerciseStrip } from '@/components/workout/exercise-strip';
import { ExerciseTitlePager } from '@/components/workout/exercise-title-pager';
import { QuickActionRow } from '@/components/workout/quick-action-row';
import { RestOptionsSheet } from '@/components/workout/rest-options-sheet';
import { RestTimer } from '@/components/workout/rest-timer';
import { SetKeypad } from '@/components/workout/set-keypad';
import { SetTable } from '@/components/workout/set-table';
import { SetTypeSheet } from '@/components/workout/set-type-sheet';
import { StructureSheet } from '@/components/workout/structure-sheet';
import { WorkoutProgress } from '@/components/workout/workout-progress';
import { useHaptics } from '@/lib/haptics';
import { formatClock } from '@/lib/workout/format';
import {
  displayDraft,
  draftToStored,
  FIELD_LABELS,
  fieldHeading,
  type KeypadKey,
  SET_FIELDS,
  type SetField,
  type SetType,
  setLabels,
  steppedValue,
  storedKey,
  storedToDraft,
  typeKey,
} from '@/lib/workout/set-entry';
import { useNow } from '@/lib/workout/use-now';
import {
  cancelRestEndNotification,
  useRestEndNotification,
} from '@/lib/workout/use-rest-end-notification';

type ActiveWorkout = NonNullable<
  FunctionReturnType<typeof api.workouts.getActive>
>;
type WorkoutExercise = ActiveWorkout['exercises'][number];
type WorkoutSet = WorkoutExercise['sets'][number];
type Focus = { setId: Id<'sets'>; field: SetField };
type Drafts = Record<string, Partial<Record<SetField, string>>>;

export default function ActiveWorkoutScreen() {
  const workout = useQuery(api.workouts.getActive);
  const settings = useQuery(api.memberSettings.get);
  const completeSet = useMutation(api.workouts.completeSet);
  const uncompleteSet = useMutation(api.workouts.uncompleteSet);
  const updateSet = useMutation(api.workouts.updateSet);
  const addSet = useMutation(api.workouts.addSet);
  const addExercise = useMutation(api.workouts.addExercise);
  const endWorkout = useMutation(api.workouts.end);
  const updateSettings = useMutation(api.memberSettings.update);
  const duplicateSet = useMutation(api.workouts.duplicateSet);
  const deleteSet = useMutation(api.workouts.deleteSet);
  const adjustRest = useMutation(api.workouts.adjustRest);
  const skipRest = useMutation(api.workouts.skipRest);
  const resetRest = useMutation(api.workouts.resetRest);
  const setExerciseRest = useMutation(api.workouts.setExerciseRest);
  const moveExercise = useMutation(api.workoutStructure.moveExercise);
  const setSkipped = useMutation(api.workoutStructure.setSkipped);
  const removeExercise = useMutation(api.workoutStructure.removeExercise);
  const swapExercise = useMutation(api.workoutStructure.swapExercise);
  const haptic = useHaptics();
  const now = useNow();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [chosenFocus, setChosenFocus] = useState<Focus | null>(null);
  const [isKeypadOpen, setIsKeypadOpen] = useState(true);
  const [typeSheetSetId, setTypeSheetSetId] = useState<Id<'sets'> | null>(null);
  const [isRestSheetOpen, setIsRestSheetOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'add' | 'swap' | null>(null);
  const [isStructureOpen, setIsStructureOpen] = useState(false);
  const [isConfirmingTerminate, setIsConfirmingTerminate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useRestEndNotification(workout?.rest?.endsAt ?? null, {
    sound: settings?.restEndSound ?? true,
    nextExercise:
      workout?.exercises.find(
        (item) =>
          !item.skipped && item.sets.some((set) => set.completedAt === null)
      )?.name ?? null,
  });

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

  const { units, effortScale } = settings;
  const firstUnfinished = workout.exercises.findIndex(
    (item) => !item.skipped && item.sets.some((set) => set.completedAt === null)
  );
  const index = Math.min(
    selectedIndex ?? Math.max(firstUnfinished, 0),
    Math.max(workout.exercises.length - 1, 0)
  );
  const exercise: WorkoutExercise | undefined = workout.exercises[index];
  const fields = exercise ? SET_FIELDS[exercise.type] : [];
  const exercisePlannedRest =
    exercise?.plannedRestSeconds ?? settings.defaultRestSeconds;
  const currentSetIndex = exercise
    ? exercise.sets.findIndex((set) => set.completedAt === null)
    : -1;
  const allDone =
    workout.progress.total > 0 &&
    workout.progress.done === workout.progress.total;
  const labels = exercise
    ? setLabels(exercise.sets.map((set) => set.type))
    : [];

  // The keypad types into the chosen cell, or else the next Set to log.
  const focusedSet = exercise?.sets.find(
    (set) => set._id === chosenFocus?.setId
  );
  const nextSet = exercise?.sets[currentSetIndex];
  const focus: Focus | null =
    focusedSet && chosenFocus
      ? chosenFocus
      : nextSet && fields[0]
        ? { setId: nextSet._id, field: fields[0] }
        : null;
  const focusSet = exercise?.sets.find((set) => set._id === focus?.setId);

  const attempt = async (action: () => Promise<unknown>, failure: string) => {
    try {
      setErrorMessage(null);
      await action();
    } catch {
      setErrorMessage(failure);
    }
  };

  const draftOf = (set: WorkoutSet, field: SetField) =>
    drafts[set._id]?.[field] ??
    storedToDraft(field, set[storedKey(field)], units);

  const setDraft = (setId: Id<'sets'>, field: SetField, draft: string) =>
    setDrafts((current) => ({
      ...current,
      [setId]: { ...current[setId], [field]: draft },
    }));

  /** The Set's typed values, as the mutation stores them. */
  const valuesOf = (set: WorkoutSet) =>
    Object.fromEntries(
      fields.flatMap((field) => {
        const value = draftToStored(field, draftOf(set, field), units);
        return value === null ? [] : [[storedKey(field), value]];
      })
    );

  const saveDrafts = (set: WorkoutSet) =>
    attempt(
      () => updateSet({ setId: set._id, ...valuesOf(set) }),
      'Could not save this Set.'
    );

  const moveFocus = (next: Focus) => {
    if (focusSet && focusSet._id !== next.setId) void saveDrafts(focusSet);
    setChosenFocus(next);
    setIsKeypadOpen(true);
  };

  const logSet = (set: WorkoutSet) =>
    attempt(async () => {
      await completeSet({ setId: set._id, ...valuesOf(set) });
      haptic('set-completed');
      setChosenFocus(null);
      const remaining = exercise?.sets.filter(
        (item) => item.completedAt === null && item._id !== set._id
      );
      if (remaining?.length === 0 && index < workout.exercises.length - 1) {
        setSelectedIndex(index + 1);
      }
    }, 'Could not log this Set.');

  const pressKey = (key: KeypadKey) => {
    if (!focus || !focusSet) return;
    setDraft(
      focus.setId,
      focus.field,
      typeKey(draftOf(focusSet, focus.field), key, focus.field)
    );
  };

  const step = (direction: 1 | -1) => {
    if (!focus || !focusSet || !exercise) return;
    const current = draftToStored(
      focus.field,
      draftOf(focusSet, focus.field),
      units
    );
    const next = steppedValue(focus.field, current, direction, exercise.stepKg);
    setDraft(focus.setId, focus.field, storedToDraft(focus.field, next, units));
    void attempt(
      () => updateSet({ setId: focus.setId, [storedKey(focus.field)]: next }),
      'Could not save this Set.'
    );
  };

  const setType = (setId: Id<'sets'>, type: SetType) =>
    attempt(() => updateSet({ setId, type }), 'Could not change the Set type.');

  const selectExercise = (next: number) => {
    if (focusSet) void saveDrafts(focusSet);
    setChosenFocus(null);
    setSelectedIndex(next);
  };

  const end = (reason: 'finish' | 'terminate') =>
    attempt(async () => {
      if (reason === 'terminate') haptic('destructive-confirmation');
      await endWorkout({ workoutId: workout._id, reason });
      await cancelRestEndNotification();
      router.replace(`/workout/finished/${workout._id}`);
    }, 'Could not end this Workout. Try again.');

  const keypad =
    focus && focusSet && isKeypadOpen ? (
      <SetKeypad
        target={`Set ${labels[exercise?.sets.indexOf(focusSet) ?? 0]} · ${FIELD_LABELS[focus.field]}`}
        field={focus.field}
        effortScale={effortScale}
        rpe={focusSet.rpe}
        isFailure={focusSet.type === 'failure'}
        onKey={pressKey}
        onStep={step}
        onRate={(rpe) =>
          attempt(
            () =>
              updateSet({
                setId: focusSet._id,
                effort: rpe === null ? null : { scale: 'RPE', value: rpe },
              }),
            'Could not save the effort.'
          )
        }
        onToggleScale={() =>
          attempt(
            () =>
              updateSettings({
                effortScale: effortScale === 'RPE' ? 'RIR' : 'RPE',
              }),
            'Could not switch the effort scale.'
          )
        }
        onToggleFailure={() =>
          setType(
            focusSet._id,
            focusSet.type === 'failure' ? 'normal' : 'failure'
          )
        }
        onLog={() => logSet(focusSet)}
        onHide={() => setIsKeypadOpen(false)}
      />
    ) : focusSet ? (
      <Row spacing={8}>
        <Button
          label="Show keypad"
          variant="outlined"
          onPress={() => setIsKeypadOpen(true)}
        />
        <Spacer />
        <Button label="Log Set" onPress={() => logSet(focusSet)} />
      </Row>
    ) : null;

  return (
    <DockedScreen dock={keypad}>
      <Row spacing={12} alignment="center">
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
          label="Exercises"
          variant="text"
          onPress={() => setIsStructureOpen(true)}
        />
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
          skipped: item.skipped,
          sets: item.sets.map((set) => ({ done: set.completedAt !== null })),
        }))}
        selectedIndex={index}
        onSelect={selectExercise}
        onAdd={() => setPickerMode('add')}
      />
      {exercise ? (
        <>
          <Row spacing={8} alignment="center">
            <ExerciseTitlePager
              pages={workout.exercises.map((item) => {
                const next = item.sets.findIndex(
                  (set) => set.completedAt === null
                );
                return {
                  key: item._id,
                  name: item.name,
                  status:
                    next === -1
                      ? `All ${item.sets.length} Sets logged`
                      : `Set ${next + 1} of ${item.sets.length}`,
                };
              })}
              selectedIndex={index}
              onSelect={selectExercise}
            />
            <RestTimer
              rest={workout.rest}
              plannedSeconds={exercisePlannedRest}
              now={now}
              onAdjust={(seconds) =>
                attempt(
                  () => adjustRest({ workoutId: workout._id, seconds }),
                  'Could not adjust rest.'
                )
              }
              onSkip={() =>
                attempt(
                  () => skipRest({ workoutId: workout._id }),
                  'Could not skip rest.'
                )
              }
              onReset={() =>
                attempt(
                  () => resetRest({ workoutId: workout._id }),
                  'Could not restart rest.'
                )
              }
              onOpenOptions={() => setIsRestSheetOpen(true)}
            />
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
              ...(exercise.sets.every((set) => set.completedAt === null) && {
                swap: () => setPickerMode('swap'),
              }),
            }}
          />
          <SetTable
            sets={exercise.sets.map((set) => ({
              _id: set._id,
              type: set.type,
              rpe: set.rpe,
              done: set.completedAt !== null,
            }))}
            fields={fields}
            headings={fields.map((field) => fieldHeading(field, units))}
            effortScale={effortScale}
            focus={isKeypadOpen ? focus : null}
            showSwipeHint={!settings.swipeHintDismissed}
            displayValue={(row, field) => {
              const set = exercise.sets.find((item) => item._id === row._id);
              return set ? displayDraft(field, draftOf(set, field)) : '';
            }}
            onFocus={(setId, field) => moveFocus({ setId, field })}
            onToggleDone={(row, done) => {
              const set = exercise.sets.find((item) => item._id === row._id);
              if (!set) return;
              if (done) void logSet(set);
              else
                void attempt(
                  () => uncompleteSet({ setId: set._id }),
                  'Could not update this Set.'
                );
            }}
            onDuplicate={(setId) =>
              attempt(
                () => duplicateSet({ setId }),
                'Could not duplicate this Set.'
              )
            }
            onDelete={(setId) =>
              attempt(() => deleteSet({ setId }), 'Could not delete this Set.')
            }
            onOpenType={setTypeSheetSetId}
            onDismissSwipeHint={() =>
              attempt(
                () => updateSettings({ swipeHintDismissed: true }),
                'Could not dismiss the hint.'
              )
            }
          />
          <Button
            label="Warm-up Set"
            variant="text"
            onPress={() =>
              attempt(
                () =>
                  addSet({ workoutExerciseId: exercise._id, type: 'warmup' }),
                'Could not add a Warm-up Set.'
              )
            }
          />
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
      {exercise ? (
        <RestOptionsSheet
          isPresented={isRestSheetOpen}
          isResting={workout.rest !== null && workout.rest.endsAt > now}
          exerciseName={exercise.name}
          defaultSeconds={exercisePlannedRest}
          onAdjust={(seconds) =>
            attempt(
              () => adjustRest({ workoutId: workout._id, seconds }),
              'Could not adjust rest.'
            )
          }
          onSkip={() => {
            setIsRestSheetOpen(false);
            void attempt(
              () => skipRest({ workoutId: workout._id }),
              'Could not skip rest.'
            );
          }}
          onSetDefault={(seconds) =>
            attempt(
              () =>
                setExerciseRest({ workoutExerciseId: exercise._id, seconds }),
              'Could not change the default rest.'
            )
          }
          onDismiss={() => setIsRestSheetOpen(false)}
        />
      ) : null}
      <SetTypeSheet
        current={
          exercise?.sets.find((set) => set._id === typeSheetSetId)?.type ?? null
        }
        onPick={(type) => {
          if (typeSheetSetId) void setType(typeSheetSetId, type);
          setTypeSheetSetId(null);
        }}
        onDismiss={() => setTypeSheetSetId(null)}
      />
      <StructureSheet
        isPresented={isStructureOpen}
        exercises={workout.exercises.map((item) => ({
          key: item._id,
          name: item.name,
          skipped: item.skipped,
          hasLoggedSets: item.sets.some((set) => set.completedAt !== null),
        }))}
        onMove={(key, toIndex) =>
          attempt(
            () =>
              moveExercise({
                workoutExerciseId: key as Id<'workoutExercises'>,
                toIndex,
              }),
            'Could not move this Exercise.'
          )
        }
        onSetSkipped={(key, skipped) =>
          attempt(
            () =>
              setSkipped({
                workoutExerciseId: key as Id<'workoutExercises'>,
                skipped,
              }),
            'Could not skip this Exercise.'
          )
        }
        onRemove={(key) =>
          attempt(async () => {
            await removeExercise({
              workoutExerciseId: key as Id<'workoutExercises'>,
            });
            setSelectedIndex(null);
          }, 'Could not remove this Exercise.')
        }
        onDismiss={() => setIsStructureOpen(false)}
      />
      <ExercisePicker
        isPresented={pickerMode !== null}
        onDismiss={() => setPickerMode(null)}
        onPick={(exerciseId) => {
          const mode = pickerMode;
          setPickerMode(null);
          if (mode === 'swap' && exercise) {
            void attempt(
              () =>
                swapExercise({ workoutExerciseId: exercise._id, exerciseId }),
              'Could not swap this Exercise.'
            );
            return;
          }
          void attempt(async () => {
            await addExercise({ workoutId: workout._id, exerciseId });
            setSelectedIndex(workout.exercises.length);
          }, 'Could not add this Exercise.');
        }}
      />
    </DockedScreen>
  );
}
