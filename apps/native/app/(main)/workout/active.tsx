import { BottomSheet, Button, Column, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { GroupDrawer } from '@/components/groups/group-drawer';
import { NativeScreen } from '@/components/native/native-screen';
import type {
  ActiveActions,
  ActiveModel,
  ExerciseTable,
  Focus,
  WorkoutExercise,
  WorkoutSet,
} from '@/components/prototype/active/model';
import { VariantCurrent } from '@/components/prototype/active/variant-current';
import { VariantFocus } from '@/components/prototype/active/variant-focus';
import { VariantOverview } from '@/components/prototype/active/variant-overview';
import { VariantTable } from '@/components/prototype/active/variant-table';
import {
  PrototypeVariants,
  useVariant,
} from '@/components/prototype/variant-switcher';
import { ExercisePicker } from '@/components/workout/exercise-picker';
import { MachineSetupSheet } from '@/components/workout/machine-setup-sheet';
import { NotesSheet, type NoteTarget } from '@/components/workout/notes-sheet';
import { PlatesSheet } from '@/components/workout/plates-sheet';
import { RestOptionsSheet } from '@/components/workout/rest-options-sheet';
import { SetTypeSheet } from '@/components/workout/set-type-sheet';
import { StructureSheet } from '@/components/workout/structure-sheet';
import { TargetSheet } from '@/components/workout/target-sheet';
import { useHaptics } from '@/lib/haptics';
import { weightInUnit } from '@/lib/workout/format';
import { setupSummary } from '@/lib/workout/machine-setup';
import { plateStrip } from '@/lib/workout/plates';
import type { QuickActionId } from '@/lib/workout/quick-actions';
import {
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
import { aheadBehind } from '@/lib/workout/time';
import { useNow } from '@/lib/workout/use-now';
import {
  cancelRestEndNotification,
  useRestEndNotification,
} from '@/lib/workout/use-rest-end-notification';
import {
  cancelStillWorkingOut,
  useStillWorkingOut,
} from '@/lib/workout/use-still-working-out';

type Drafts = Record<string, Partial<Record<SetField, string>>>;

// PROTOTYPE: the presentation of this route switches on `?variant=`.
const VARIANTS = [
  { key: 'A', name: 'Current' },
  { key: 'B', name: 'Table' },
  { key: 'C', name: 'Focus' },
  { key: 'D', name: 'Overview' },
] as const;

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
  const group = useQuery(api.groups.getMine);
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
  const variant = useVariant(VARIANTS);
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
  const [noteTarget, setNoteTarget] = useState<NoteTarget | null>(null);
  const [setupFor, setSetupFor] = useState<Id<'workoutExercises'> | null>(null);
  const [isPlatesOpen, setIsPlatesOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const touchSet = useMutation(api.workouts.touchSet);
  const touched = useRef(new Set<Id<'sets'>>());
  // Set once ending is possible; the idle notification's Finish calls it.
  const finishFromIdle = useRef(() => {});

  const stillWorkingOut = useStillWorkingOut({
    enabled: Boolean(workout),
    lastActivity: workout
      ? Math.max(
          workout.startedAt,
          workout.rest?.startedAt ?? 0,
          ...workout.exercises.flatMap((item) =>
            item.sets.flatMap((set) => [
              set.completedAt ?? 0,
              set.firstTouchedAt ?? 0,
            ])
          )
        )
      : 0,
    now,
    onFinish: () => finishFromIdle.current(),
  });

  useRestEndNotification(workout?.rest?.endsAt ?? null, {
    sound: settings?.restEndSound ?? true,
    haptics: settings?.haptics ?? false,
    nextExercise:
      workout?.exercises.find(
        (item) =>
          !item.skipped && item.sets.some((set) => set.completedAt === null)
      )?.name ?? null,
  });

  // Only changed interaction state counts: mounting and hydration are not activity.
  const { markActive } = stillWorkingOut;
  const previousInteraction = useRef<readonly unknown[] | null>(null);
  useEffect(() => {
    const current = [
      noteTarget,
      setupFor,
      isPlatesOpen,
      targetSheetId,
      pickerMode,
      isStructureOpen,
      isRestSheetOpen,
      typeSheetSetId,
      groupOpen,
      isKeypadOpen,
      selectedIndex,
      chosenFocus,
    ];
    const previous = previousInteraction.current;
    previousInteraction.current = current;
    if (previous && current.some((value, index) => value !== previous[index])) {
      markActive();
    }
  }, [
    markActive,
    noteTarget,
    setupFor,
    isPlatesOpen,
    targetSheetId,
    pickerMode,
    isStructureOpen,
    isRestSheetOpen,
    typeSheetSetId,
    groupOpen,
    isKeypadOpen,
    selectedIndex,
    chosenFocus,
  ]);

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
  // Machine setup is for machine and cable Exercises only.
  const usesMachineSetup =
    exercise?.equipment === 'machine' || exercise?.equipment === 'cable';
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

  // Every Workout edit goes through here, so each one moves the idle alert.
  const attempt = async (action: () => Promise<unknown>, failure: string) => {
    stillWorkingOut.markActive();
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

  const setDraft = (setId: Id<'sets'>, field: SetField, draft: string) => {
    stillWorkingOut.markActive();
    setDrafts((current) => ({
      ...current,
      [setId]: { ...current[setId], [field]: draft },
    }));
  };

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
    stillWorkingOut.markActive();
    if (focusSet && focusSet._id !== next.setId) void saveDrafts(focusSet);
    setChosenFocus(next);
    setIsKeypadOpen(true);
  };

  const logSet = (set: WorkoutSet) => {
    // The Set may belong to an Exercise other than the selected one.
    const owner = workout.exercises.find((item) =>
      item.sets.some((candidate) => candidate._id === set._id)
    );
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
        ...draftsToPatch(
          owner ? SET_FIELDS[owner.type] : fields,
          drafts[set._id],
          units
        ),
      });
      haptic(targetMet ? 'target-met' : 'set-completed');
    }, 'Could not log this Set.');
  };

  const pressKey = (key: KeypadKey) => {
    if (!focus || !focusSet) return;
    // The first keypad press on a Set starts its working time.
    if (
      focusSet.firstTouchedAt === null &&
      focusSet.completedAt === null &&
      !touched.current.has(focusSet._id)
    ) {
      touched.current.add(focusSet._id);
      void touchSet({ setId: focusSet._id });
    }
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
    stillWorkingOut.markActive();
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
      await cancelStillWorkingOut();
      router.replace(`/workout/finished/${workout._id}`);
    }, 'Could not end this Workout. Try again.');
  // Ends at the last completed Set; the backend records that as the end.
  const finishNow = () =>
    end(
      workout.progress.done === workout.progress.total ? 'finish' : 'terminate'
    );
  finishFromIdle.current = finishNow;

  // While a barbell weight is being edited: its per-side plate breakdown.
  const editedWeightKg =
    exercise?.equipment === 'barbell' &&
    isKeypadOpen &&
    focusSet &&
    focus?.field === 'weight'
      ? (draftToStored('weight', draftOf(focusSet, 'weight'), units) ??
        openTarget(focusSet, targetsEnabled)?.weightKg ??
        null)
      : null;

  // One Exercise's Set table, as SetTable takes it.
  const tableFor = (item: WorkoutExercise): ExerciseTable => {
    const itemFields = SET_FIELDS[item.type];
    const itemTargetsEnabled =
      settings.overloadTargets &&
      !settings.targetsOffExerciseIds.includes(item.exerciseId);
    const itemShowsPrevious = item.type === 'timed' || item.type === 'cardio';
    return {
      sets: item.sets.map((set) => {
        const target = workingTarget(set, itemTargetsEnabled);
        const open = openTarget(set, itemTargetsEnabled);
        return {
          _id: set._id,
          type: set.type,
          rpe: set.rpe,
          done: set.completedAt !== null,
          hasNote: set.note !== null,
          target: itemShowsPrevious
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
          cells: itemFields.map((field) => ({
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
              itemTargetsEnabled &&
              drafts[set._id]?.[field] === undefined &&
              (field === 'weight' || field === 'reps') &&
              set.fromTarget?.[field] === true,
          })),
        };
      }),
      labels: setLabels(item.sets.map((set) => set.type)),
      headings: itemFields.map((field) => fieldHeading(field, units)),
      fields: itemFields,
      targetHeading: itemShowsPrevious ? 'Last time' : 'Target',
    };
  };

  const progressFraction =
    workout.progress.total === 0
      ? 0
      : workout.progress.done / workout.progress.total;

  const model: ActiveModel = {
    workout,
    settings,
    group,
    now,
    elapsedSeconds: (now - workout.startedAt) / 1000,
    units,
    effortScale,
    index,
    exercise,
    table: exercise ? tableFor(exercise) : null,
    tableFor,
    strip: workout.exercises.map((item, itemIndex) => ({
      key: item._id,
      name: item.name,
      skipped: item.skipped,
      linkedToNext:
        item.blockId !== null &&
        workout.exercises[itemIndex + 1]?.blockId === item.blockId,
      sets: item.sets.map((set) => ({ done: set.completedAt !== null })),
    })),
    titlePages: workout.exercises.map((item) => {
      const next = item.sets.findIndex((set) => set.completedAt === null);
      return {
        key: item._id,
        name: item.name,
        status:
          next === -1
            ? `All ${item.sets.length} Sets logged`
            : `Set ${next + 1} of ${item.sets.length}`,
      };
    }),
    alternating:
      exercise && partners.length > 0
        ? {
            roundLabel: `Alternating sets · Round ${roundNumber(workout, exercise._id) ?? (block?.roundsCompleted ?? 0) + 1}`,
            withNames: `With ${partners.map((partner) => partner.name).join(', ')}`,
            stayOnName:
              stayOn !== null
                ? (workout.exercises[stayOn]?.name ?? null)
                : null,
            canSkipForNow: canSkipForNow(workout, exercise._id),
          }
        : null,
    plannedRestSeconds: exercisePlannedRest,
    machineSetup:
      usesMachineSetup && exercise?.machineSetup
        ? setupSummary(exercise.machineSetup)
        : null,
    quickActionBadges: {
      note: exercise
        ? exercise.sets.filter((set) => set.note !== null).length +
          (exercise.standingNote ? 1 : 0)
        : 0,
    },
    progressFraction,
    allDone,
    aheadBehind:
      settings.aheadBehind && workout.targetDurationSeconds
        ? aheadBehind(
            (now - workout.startedAt) / 1000,
            workout.targetDurationSeconds,
            progressFraction
          )
        : null,
    isIdle: stillWorkingOut.isIdle,
    isConfirmingTerminate,
    errorMessage,
    focus,
    focusSet,
    isKeypadOpen,
    keypadTarget:
      focus && focusSet
        ? `Set ${labels[exercise?.sets.indexOf(focusSet) ?? 0]} · ${FIELD_LABELS[focus.field]}`
        : null,
    plateStrip:
      editedWeightKg === null
        ? null
        : plateStrip(
            weightInUnit(editedWeightKg, settings.plates.unit),
            settings.plates
          ),
  };

  const quick: Partial<Record<QuickActionId, () => void>> = exercise
    ? {
        note: () =>
          setNoteTarget(
            focusSet
              ? {
                  kind: 'set',
                  workoutExerciseId: exercise._id,
                  setId: focusSet._id,
                }
              : { kind: 'exercise', workoutExerciseId: exercise._id }
          ),
        ...(usesMachineSetup &&
          !exercise.machineSetup && {
            setup: () => setSetupFor(exercise._id),
          }),
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
        ...(exercise.equipment === 'barbell' && {
          plates: () => setIsPlatesOpen(true),
        }),
        ...(exercise.sets.every((set) => set.completedAt === null) && {
          swap: () => setPickerMode('swap'),
        }),
      }
    : {};

  const actions: ActiveActions = {
    selectExercise,
    openAddExercise: () => setPickerMode('add'),
    openStructure: () => setIsStructureOpen(true),
    openMenu: () => setIsMenuOpen(true),
    openGroup: () => router.push('/workout/group'),
    openGroupDrawer: () => setGroupOpen(true),
    openWorkoutNote: () => setNoteTarget({ kind: 'workout' }),
    askTerminate: () => setIsConfirmingTerminate(true),
    cancelTerminate: () => setIsConfirmingTerminate(false),
    terminate: () => end('terminate'),
    finish: () => end('finish'),
    finishNow,
    keepGoing: stillWorkingOut.markActive,
    adjustRest: (seconds) =>
      attempt(
        () => adjustRest({ workoutId: workout._id, seconds }),
        'Could not adjust rest.'
      ),
    skipRest: () =>
      attempt(
        () => skipRest({ workoutId: workout._id }),
        'Could not skip rest.'
      ),
    resetRest: () =>
      attempt(
        () => resetRest({ workoutId: workout._id }),
        'Could not restart rest.'
      ),
    openRestOptions: () => setIsRestSheetOpen(true),
    stayOn: () => {
      if (stayOn === null) return;
      setSelectedIndex(stayOn);
      setStayOn(null);
    },
    skipForNow: () => {
      if (!exercise) return;
      void attempt(async () => {
        const { next } = await skipForNow({
          workoutExerciseId: exercise._id,
        });
        const nextIndex = workout.exercises.findIndex(
          (item) => item._id === next
        );
        if (nextIndex >= 0) selectExercise(nextIndex);
      }, 'Could not skip this Exercise for now.');
    },
    openExerciseNote: () => {
      if (exercise) {
        setNoteTarget({ kind: 'exercise', workoutExerciseId: exercise._id });
      }
    },
    editSetup: () => {
      if (exercise) setSetupFor(exercise._id);
    },
    quick,
    addWarmupSet: () => {
      if (!exercise) return;
      void attempt(
        () => addSet({ workoutExerciseId: exercise._id, type: 'warmup' }),
        'Could not add a Warm-up Set.'
      );
    },
    openPlates: () => setIsPlatesOpen(true),
    focusCell: (setId, field) => moveFocus({ setId, field }),
    focusCellOf: (exerciseIndex, setId, field) => {
      if (exerciseIndex === index) {
        moveFocus({ setId, field });
        return;
      }
      stillWorkingOut.markActive();
      if (focusSet) void saveDrafts(focusSet);
      setStayOn(null);
      setSelectedIndex(exerciseIndex);
      setChosenFocus({ setId, field });
      setIsKeypadOpen(true);
    },
    fillFromTarget: (setId, field) => {
      moveFocus({ setId, field });
      void attempt(
        () => fillFromTarget({ setId }),
        'Could not fill this Set from the target.'
      );
    },
    toggleDone: (row, done) => {
      const set = workout.exercises
        .flatMap((item) => item.sets)
        .find((item) => item._id === row._id);
      if (!set) return;
      if (done) void logSet(set);
      else
        void attempt(
          () => uncompleteSet({ setId: set._id }),
          'Could not update this Set.'
        );
    },
    openSetNote: (setId) => {
      const owner = workout.exercises.find((item) =>
        item.sets.some((candidate) => candidate._id === setId)
      );
      if (owner) {
        setNoteTarget({
          kind: 'set',
          workoutExerciseId: owner._id,
          setId,
        });
      }
    },
    duplicateSet: (setId) =>
      attempt(() => duplicateSet({ setId }), 'Could not duplicate this Set.'),
    deleteSet: (setId) =>
      attempt(() => deleteSet({ setId }), 'Could not delete this Set.'),
    openSetType: setTypeSheetSetId,
    openTarget: (workoutExerciseId) => {
      const target = workoutExerciseId ?? exercise?._id;
      if (target) setTargetSheetId(target);
    },
    dismissSwipeHint: () =>
      attempt(
        () => updateSettings({ swipeHintDismissed: true }),
        'Could not dismiss the hint.'
      ),
    pressKey,
    step,
    rate: (rpe) => {
      if (!focusSet) return;
      void attempt(
        () =>
          updateSet({
            setId: focusSet._id,
            effort: rpe === null ? null : { scale: 'RPE', value: rpe },
          }),
        'Could not save the effort.'
      );
    },
    toggleScale: () =>
      attempt(
        () =>
          updateSettings({
            effortScale: effortScale === 'RPE' ? 'RIR' : 'RPE',
          }),
        'Could not switch the effort scale.'
      ),
    toggleFailure: () => {
      if (!focusSet) return;
      void setType(
        focusSet._id,
        focusSet.type === 'failure' ? 'normal' : 'failure'
      );
    },
    logFocused: () => {
      if (focusSet) void logSet(focusSet);
    },
    hideKeypad: () => setIsKeypadOpen(false),
    showKeypad: () => setIsKeypadOpen(true),
  };

  return (
    <PrototypeVariants variants={VARIANTS}>
      {variant === 'B' ? (
        <VariantTable model={model} actions={actions} />
      ) : variant === 'C' ? (
        <VariantFocus model={model} actions={actions} />
      ) : variant === 'D' ? (
        <VariantOverview model={model} actions={actions} />
      ) : (
        <VariantCurrent model={model} actions={actions} />
      )}
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
      <GroupDrawer
        isPresented={groupOpen}
        onDismiss={() => setGroupOpen(false)}
      />
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
        onActivity={stillWorkingOut.markActive}
        workoutExerciseId={targetSheetId}
        units={units}
        effortScale={effortScale}
        onDismiss={() => setTargetSheetId(null)}
      />
      <NotesSheet
        onActivity={stillWorkingOut.markActive}
        workout={workout}
        opened={noteTarget}
        onDismiss={() => setNoteTarget(null)}
      />
      <MachineSetupSheet
        key={setupFor ?? 'closed'}
        onActivity={stillWorkingOut.markActive}
        exercise={
          workout.exercises.find((item) => item._id === setupFor) ?? null
        }
        onDismiss={() => setSetupFor(null)}
      />
      <PlatesSheet
        key={isPlatesOpen ? 'open' : 'closed'}
        isPresented={isPlatesOpen}
        onActivity={stillWorkingOut.markActive}
        inventory={settings.plates}
        weightKg={
          editedWeightKg ??
          focusSet?.weightKg ??
          (focusSet && openTarget(focusSet, targetsEnabled)?.weightKg) ??
          null
        }
        onDismiss={() => setIsPlatesOpen(false)}
      />
      <SetTypeSheet
        current={
          workout.exercises
            .flatMap((item) => item.sets)
            .find((set) => set._id === typeSheetSetId)?.type ?? null
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
    </PrototypeVariants>
  );
}
