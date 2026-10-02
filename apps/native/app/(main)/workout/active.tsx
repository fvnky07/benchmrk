import {
  BottomSheet,
  Button,
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
import { TargetSheet } from '@/components/workout/target-sheet';
import { WorkoutProgress } from '@/components/workout/workout-progress';
import { useHaptics } from '@/lib/haptics';
import { formatClock } from '@/lib/workout/format';
import {
  type ActiveWorkout,
  blockPartners,
  canSkipForNow,
  roundNumber,
  withSetLogged,
} from '@/lib/workout/rounds';
import {
  displayDraft,
  draftsToPatch,
  draftToStored,
  FIELD_LABELS,
  fieldHeading,
  type KeypadKey,
  SET_FIELDS,
  type SetField,
  type SetType,
  setLabels,
  setSummary,
  steppedValue,
  storedKey,
  storedToDraft,
  TARGET_VALUE,
  targetText,
  typeKey,
} from '@/lib/workout/set-entry';
import { useNow } from '@/lib/workout/use-now';
import {
  cancelRestEndNotification,
  useRestEndNotification,
} from '@/lib/workout/use-rest-end-notification';

type WorkoutExercise = ActiveWorkout['exercises'][number];
type WorkoutSet = WorkoutExercise['sets'][number];
type Focus = { setId: Id<'sets'>; field: SetField };
type Drafts = Record<string, Partial<Record<SetField, string>>>;

/** A Working Set's target is visible only while targets are enabled. */
function workingTarget(set: WorkoutSet, targetsEnabled: boolean) {
  return targetsEnabled && (set.type === 'normal' || set.type === 'failure')
    ? set.target
    : null;
}

/** The target an empty field of an unlogged Working Set shows and logs. */
function openTarget(set: WorkoutSet, targetsEnabled: boolean) {
  return set.completedAt === null ? workingTarget(set, targetsEnabled) : null;
}

export default function ActiveWorkoutScreen() {
  const workout = useQuery(api.workouts.getActive);
  const settings = useQuery(api.memberSettings.get);
  // Logging is instant: the shared round engine applies the Set, round and
  // rest locally exactly as the backend will.
  const completeSet = useMutation(
    api.workouts.completeSet
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.workouts.getActive, {});
    const memberSettings = localStore.getQuery(api.memberSettings.get, {});
    if (!current || !memberSettings) return;
    const logged = withSetLogged(
      current,
      args.setId,
      Date.now(),
      memberSettings
    );
    if (logged) {
      localStore.setQuery(api.workouts.getActive, {}, logged.workout);
    }
  });
  const uncompleteSet = useMutation(api.workouts.uncompleteSet);
  const updateSet = useMutation(api.workouts.updateSet);
  const fillFromTarget = useMutation(api.workouts.fillFromTarget);
  const fillFromTargets = useMutation(api.workouts.fillFromTargets);
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
  const linkExercise = useMutation(api.workoutStructure.linkExercise);
  const unlinkExercise = useMutation(api.workoutStructure.unlinkExercise);
  const skipForNow = useMutation(api.workouts.skipForNow);
  const haptic = useHaptics();
  const now = useNow();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [chosenFocus, setChosenFocus] = useState<Focus | null>(null);
  const [isKeypadOpen, setIsKeypadOpen] = useState(true);
  const [typeSheetSetId, setTypeSheetSetId] = useState<Id<'sets'> | null>(null);
  const [targetSheetId, setTargetSheetId] =
    useState<Id<'workoutExercises'> | null>(null);
  const [isRestSheetOpen, setIsRestSheetOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'add' | 'swap' | null>(null);
  const [isStructureOpen, setIsStructureOpen] = useState(false);
  const [isConfirmingTerminate, setIsConfirmingTerminate] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // After an auto-advance within a round: the Exercise to stay on instead.
  const [stayOn, setStayOn] = useState<number | null>(null);

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
  const targetsEnabled =
    settings.overloadTargets &&
    exercise !== undefined &&
    !settings.targetsOffExerciseIds.includes(exercise.exerciseId);
  const fields = exercise ? SET_FIELDS[exercise.type] : [];
  // Timed and cardio Exercises show the previous Set instead of a target.
  const showsPrevious =
    exercise?.type === 'timed' || exercise?.type === 'cardio';
  const partners = exercise ? blockPartners(workout, exercise._id) : [];
  const block = workout.blocks.find((item) => item._id === exercise?.blockId);
  // In Alternating sets, rest comes after each round, at the block's rest.
  const exercisePlannedRest =
    partners.length > 0
      ? (block?.plannedRestSeconds ?? settings.defaultRestSeconds)
      : (exercise?.plannedRestSeconds ?? settings.defaultRestSeconds);
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

  const saveDrafts = (set: WorkoutSet) =>
    attempt(
      () =>
        updateSet({
          setId: set._id,
          ...draftsToPatch(fields, drafts[set._id], units),
        }),
      'Could not save this Set.'
    );

  const moveFocus = (next: Focus) => {
    if (focusSet && focusSet._id !== next.setId) void saveDrafts(focusSet);
    setChosenFocus(next);
    setIsKeypadOpen(true);
  };

  const logSet = (set: WorkoutSet) => {
    const local = withSetLogged(workout, set._id, Date.now(), settings);
    const nextIndex = workout.exercises.findIndex(
      (item) => item._id === local?.next
    );
    setChosenFocus(null);
    if (nextIndex >= 0 && nextIndex !== index) setSelectedIndex(nextIndex);
    setStayOn(
      nextIndex >= 0 &&
        nextIndex !== index &&
        partners.length > 0 &&
        !local?.roundCompleted
        ? index
        : null
    );
    return attempt(async () => {
      const { targetMet } = await completeSet({
        setId: set._id,
        ...draftsToPatch(fields, drafts[set._id], units),
      });
      haptic(targetMet ? 'target-met' : 'set-completed');
    }, 'Could not log this Set.');
  };

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
    // An empty field steps from its Overload target.
    const target = openTarget(focusSet, targetsEnabled);
    const current =
      draftToStored(focus.field, draftOf(focusSet, focus.field), units) ??
      (target ? TARGET_VALUE[focus.field](target) : null);
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
    setStayOn(null);
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
          label="Group"
          variant="text"
          onPress={() => router.push('/workout/group')}
        />
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
        exercises={workout.exercises.map((item, itemIndex) => ({
          key: item._id,
          name: item.name,
          skipped: item.skipped,
          linkedToNext:
            item.blockId !== null &&
            workout.exercises[itemIndex + 1]?.blockId === item.blockId,
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
          {partners.length > 0 ? (
            <Row spacing={8} alignment="center">
              <Column spacing={2}>
                <Text textStyle={{ fontSize: 14, fontWeight: '600' }}>
                  {`Alternating sets · Round ${roundNumber(workout, exercise._id) ?? (block?.roundsCompleted ?? 0) + 1}`}
                </Text>
                <Text textStyle={{ fontSize: 13 }}>
                  {`With ${partners.map((partner) => partner.name).join(', ')}`}
                </Text>
              </Column>
              <Spacer />
              {stayOn !== null && workout.exercises[stayOn] ? (
                <Button
                  label={`Stay on ${workout.exercises[stayOn].name}`}
                  variant="text"
                  onPress={() => {
                    setSelectedIndex(stayOn);
                    setStayOn(null);
                  }}
                />
              ) : canSkipForNow(workout, exercise._id) ? (
                <Button
                  label="Skip for now"
                  variant="text"
                  onPress={() =>
                    attempt(async () => {
                      const { next } = await skipForNow({
                        workoutExerciseId: exercise._id,
                      });
                      const nextIndex = workout.exercises.findIndex(
                        (item) => item._id === next
                      );
                      if (nextIndex >= 0) selectExercise(nextIndex);
                    }, 'Could not skip this Exercise for now.')
                  }
                />
              ) : null}
            </Row>
          ) : null}
          <QuickActionRow
            actions={settings.quickActions}
            handlers={{
              ...(exercise.sets.some(
                (set) =>
                  openTarget(set, targetsEnabled) !== null &&
                  set.weightKg === null &&
                  set.reps === null
              ) && {
                wand: () =>
                  attempt(
                    () => fillFromTargets({ workoutExerciseId: exercise._id }),
                    'Could not fill the Sets from the target.'
                  ),
              }),
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
            sets={exercise.sets.map((set) => {
              const target = workingTarget(set, targetsEnabled);
              const open = openTarget(set, targetsEnabled);
              return {
                _id: set._id,
                type: set.type,
                rpe: set.rpe,
                done: set.completedAt !== null,
                target: showsPrevious
                  ? set.previous &&
                    setSummary(
                      {
                        weightKg: null,
                        reps: null,
                        durationSeconds: set.previous.durationSeconds ?? null,
                        distanceMeters: set.previous.distanceMeters ?? null,
                      },
                      units
                    )
                  : target && targetText(target, units),
                cells: fields.map((field) => ({
                  field,
                  value: displayDraft(field, draftOf(set, field)),
                  placeholder: displayDraft(
                    field,
                    storedToDraft(
                      field,
                      open ? TARGET_VALUE[field](open) : null,
                      units
                    )
                  ),
                  fromTarget:
                    targetsEnabled &&
                    drafts[set._id]?.[field] === undefined &&
                    (field === 'weight' || field === 'reps') &&
                    set.fromTarget?.[field] === true,
                })),
              };
            })}
            headings={fields.map((field) => fieldHeading(field, units))}
            effortScale={effortScale}
            focus={isKeypadOpen ? focus : null}
            showSwipeHint={!settings.swipeHintDismissed}
            onFocus={(setId, field) => moveFocus({ setId, field })}
            onFillFromTarget={(setId, field) => {
              moveFocus({ setId, field });
              void attempt(
                () => fillFromTarget({ setId }),
                'Could not fill this Set from the target.'
              );
            }}
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
            onOpenTarget={() => setTargetSheetId(exercise._id)}
            targetHeading={showsPrevious ? 'Last time' : 'Target'}
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
              setPickerMode('add');
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
      {exercise ? (
        <RestOptionsSheet
          isPresented={isRestSheetOpen}
          isResting={workout.rest !== null && workout.rest.endsAt > now}
          exerciseName={
            partners.length > 0
              ? `${[exercise, ...partners].map((item) => item.name).join(' ↔ ')} (after each round)`
              : exercise.name
          }
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
      <TargetSheet
        workoutExerciseId={targetSheetId}
        units={units}
        effortScale={effortScale}
        onDismiss={() => setTargetSheetId(null)}
      />
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
          blockKey: item.blockId,
        }))}
        onLink={(key, withKey) =>
          attempt(
            () =>
              linkExercise({
                workoutExerciseId: withKey as Id<'workoutExercises'>,
                withWorkoutExerciseId: key as Id<'workoutExercises'>,
              }),
            'Could not link these Exercises.'
          )
        }
        onUnlink={(key) =>
          attempt(
            () =>
              unlinkExercise({
                workoutExerciseId: key as Id<'workoutExercises'>,
              }),
            'Could not unlink this Exercise.'
          )
        }
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
