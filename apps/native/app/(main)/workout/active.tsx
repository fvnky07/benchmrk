import EditNoteIcon from '@expo/material-symbols/edit_note.xml';
import KeepIcon from '@expo/material-symbols/keep.xml';
import {
  BottomSheet,
  Column,
  Host,
  Icon,
  type IconProps,
  Row,
  ScrollView,
  Text,
} from '@expo/ui';
import {
  background,
  clip,
  fillMaxSize,
  fillMaxWidth,
  paddingAll,
  Shapes,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { type ColorValue, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GroupChip } from '@/components/groups/group-chip';
import { GroupDrawer } from '@/components/groups/group-drawer';
import { Card, CardRow } from '@/components/native/card';
import {
  NativeScreen,
  shellSafeAreaEdges,
} from '@/components/native/native-screen';
import { PillChip } from '@/components/native/pill-chip';
import { PrimaryButton } from '@/components/native/primary-button';
import { SectionHeader } from '@/components/native/section-header';
import { ExercisePicker } from '@/components/workout/exercise-picker';
import { ExerciseStrip } from '@/components/workout/exercise-strip';
import { ExerciseTitlePager } from '@/components/workout/exercise-title-pager';
import { MachineSetupSheet } from '@/components/workout/machine-setup-sheet';
import { NotesSheet, type NoteTarget } from '@/components/workout/notes-sheet';
import { PlatesSheet } from '@/components/workout/plates-sheet';
import { QuickActionRow } from '@/components/workout/quick-action-row';
import { RestOptionsSheet } from '@/components/workout/rest-options-sheet';
import { RestTimer } from '@/components/workout/rest-timer';
import { SetKeypad } from '@/components/workout/set-keypad';
import { SetTable } from '@/components/workout/set-table';
import { SetTypeSheet } from '@/components/workout/set-type-sheet';
import { StructureSheet } from '@/components/workout/structure-sheet';
import { TargetSheet } from '@/components/workout/target-sheet';
import { WorkoutProgress } from '@/components/workout/workout-progress';
import {
  fillRowWidth,
  WorkoutTopBar,
} from '@/components/workout/workout-top-bar';
import { useHaptics } from '@/lib/haptics';
import {
  font,
  fullWidthSurface,
  radius,
  space,
  tabularDigits,
  textColor,
  useAppearance,
  useColors,
  useContentWidth,
} from '@/lib/ui';
import { weightInUnit } from '@/lib/workout/format';
import { setupSummary } from '@/lib/workout/machine-setup';
import { plateStrip } from '@/lib/workout/plates';
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

type WorkoutExercise = ActiveWorkout['exercises'][number];
type WorkoutSet = WorkoutExercise['sets'][number];
type Focus = { setId: Id<'sets'>; field: SetField };
type Drafts = Record<string, Partial<Record<SetField, string>>>;

const NOTE_ICON = { ios: 'note.text', android: EditNoteIcon } as const;
const PIN_ICON = { ios: 'pin.fill', android: KeepIcon } as const;
/** Room the "Keypad" pill takes beside "Log Set" in the collapsed dock. */
const KEYPAD_PILL_ROOM = 108;

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

/**
 * The dock's surface: full width, `surfaceContainer`, rounded on top. SwiftUI
 * has no per-corner clip modifier here, so iOS rounds every corner.
 */
function dockSurface(color: ColorValue) {
  return Platform.OS === 'android'
    ? {
        modifiers: [
          fillMaxWidth(),
          clip(
            Shapes.RoundedCorner({
              topStart: radius.dock,
              topEnd: radius.dock,
            })
          ),
          background(color),
          paddingAll(space.md),
        ],
      }
    : fullWidthSurface({
        backgroundColor: color,
        borderRadius: radius.dock,
        padding: space.md,
      });
}

/**
 * The Active Workout frame: a top bar fixed above the scrolling Workout and
 * a docked panel below it. `DockedScreen` has no header slot, and a scrolling
 * top bar would take the clock and the rest timer off screen.
 */
function WorkoutFrame({
  header,
  dock,
  children,
}: Readonly<{ header: ReactNode; dock: ReactNode; children: ReactNode }>) {
  const { resolvedAppearance } = useAppearance();
  const colors = useColors();
  const isAndroid = Platform.OS === 'android';

  return (
    <SafeAreaView edges={shellSafeAreaEdges(['top'])} style={{ flex: 1 }}>
      <Host colorScheme={resolvedAppearance} style={{ flex: 1 }}>
        <Column spacing={0} modifiers={isAndroid ? [fillMaxSize()] : undefined}>
          <Column
            style={{
              paddingHorizontal: space.screen,
              paddingTop: space.sm,
              paddingBottom: space.xs,
            }}
          >
            {header}
          </Column>
          <ScrollView
            showsIndicators={false}
            modifiers={isAndroid ? [weight(1)] : undefined}
          >
            <Column
              spacing={space.lg}
              style={{
                paddingHorizontal: space.screen,
                paddingTop: space.sm,
                paddingBottom: space.lg,
              }}
            >
              {children}
            </Column>
          </ScrollView>
          {dock ? (
            <Column
              spacing={space.sm}
              {...dockSurface(colors.surfaceContainer)}
            >
              {dock}
            </Column>
          ) : null}
        </Column>
      </Host>
    </SafeAreaView>
  );
}

/** A full-width tinted card: the idle prompt, Terminate confirmation, errors and Alternating sets. */
function TintedCard({
  fill,
  padding,
  spacing,
  children,
}: Readonly<{
  fill: ColorValue;
  padding: number;
  spacing?: number;
  children: ReactNode;
}>) {
  return (
    <Column
      spacing={spacing}
      {...fullWidthSurface({
        backgroundColor: fill,
        borderRadius: radius.card,
        padding,
      })}
    >
      {children}
    </Column>
  );
}

/** A one-line note or setup row: icon, muted text, an optional pill. */
function InfoRow({
  icon,
  text,
  actionLabel,
  onPress,
}: Readonly<{
  icon: IconProps['name'];
  text: string;
  actionLabel?: string;
  onPress: () => void;
}>) {
  const colors = useColors();

  return (
    <Row alignment="center" spacing={space.sm} onPress={onPress}>
      <Icon name={icon} size={16} color={colors.onSurfaceVariant} />
      <Text
        numberOfLines={2}
        textStyle={{ fontSize: 14, color: textColor(colors.onSurfaceVariant) }}
        modifiers={fillRowWidth()}
      >
        {text}
      </Text>
      {actionLabel ? <PillChip label={actionLabel} onPress={onPress} /> : null}
    </Row>
  );
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
  const colors = useColors();
  const contentWidth = useContentWidth();
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
      <NativeScreen edges={['top']}>
        <Card padding={space.lg}>
          <Text
            textStyle={{
              ...font.caption,
              color: textColor(colors.onSurfaceVariant),
            }}
          >
            Loading Workout…
          </Text>
        </Card>
      </NativeScreen>
    );
  }

  if (workout === null || settings === null) {
    return (
      <NativeScreen edges={['top']}>
        <Card padding={space.lg}>
          <Text
            textStyle={{ ...font.section, color: textColor(colors.onSurface) }}
          >
            No Workout in progress
          </Text>
        </Card>
        <PrimaryButton label="Back to Workouts" onPress={() => router.back()} />
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

  const progressFraction =
    workout.progress.total === 0
      ? 0
      : workout.progress.done / workout.progress.total;
  const pace =
    settings.aheadBehind && workout.targetDurationSeconds
      ? aheadBehind(
          (now - workout.startedAt) / 1000,
          workout.targetDurationSeconds,
          progressFraction
        )
      : null;
  // The dock spans the screen inside its 12pt inset.
  const dockWidth = contentWidth + 2 * (space.screen - space.md);
  const muted = { ...font.caption, color: textColor(colors.onSurfaceVariant) };

  const dock =
    focus && focusSet && isKeypadOpen ? (
      <SetKeypad
        width={dockWidth}
        target={`Set ${labels[exercise?.sets.indexOf(focusSet) ?? 0]} · ${FIELD_LABELS[focus.field]}`}
        field={focus.field}
        effortScale={effortScale}
        rpe={focusSet.rpe}
        isFailure={focusSet.type === 'failure'}
        plateStrip={
          editedWeightKg === null
            ? null
            : plateStrip(
                weightInUnit(editedWeightKg, settings.plates.unit),
                settings.plates
              )
        }
        onOpenPlates={() => setIsPlatesOpen(true)}
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
    ) : allDone ? (
      <PrimaryButton
        label="Finish Workout"
        width={dockWidth}
        onPress={() => end('finish')}
      />
    ) : focusSet ? (
      <Row alignment="center" spacing={space.sm}>
        <PillChip label="Keypad" onPress={() => setIsKeypadOpen(true)} />
        <PrimaryButton
          label="Log Set"
          width={dockWidth - KEYPAD_PILL_ROOM}
          onPress={() => logSet(focusSet)}
        />
      </Row>
    ) : null;

  return (
    <WorkoutFrame
      header={
        <WorkoutTopBar
          elapsedSeconds={(now - workout.startedAt) / 1000}
          workoutName={workout.name}
          rest={
            exercise ? (
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
            ) : null
          }
          onOpenExercises={() => setIsStructureOpen(true)}
          onOpenMenu={() => setIsMenuOpen(true)}
        />
      }
      dock={dock}
    >
      <Column spacing={6}>
        <WorkoutProgress fraction={progressFraction} />
        <Text textStyle={muted} modifiers={tabularDigits()}>
          {`${workout.progress.done}/${workout.progress.total} Sets${pace ? ` · ${pace}` : ''}`}
        </Text>
      </Column>
      {stillWorkingOut.isIdle || isConfirmingTerminate || errorMessage ? (
        <Column spacing={space.sm}>
          {stillWorkingOut.isIdle ? (
            <TintedCard
              fill={colors.secondaryContainer}
              padding={space.lg}
              spacing={space.md}
            >
              <Column spacing={2}>
                <Text
                  textStyle={{
                    ...font.section,
                    color: textColor(colors.onSecondaryContainer),
                  }}
                >
                  Still working out?
                </Text>
                <Text
                  textStyle={{
                    fontSize: 15,
                    color: textColor(colors.onSecondaryContainer),
                  }}
                >
                  Nothing has happened for 20 minutes.
                </Text>
              </Column>
              <Row spacing={space.sm}>
                <PillChip label="Finish Workout" selected onPress={finishNow} />
                <PillChip
                  label="Keep going"
                  onPress={stillWorkingOut.markActive}
                />
              </Row>
            </TintedCard>
          ) : null}
          {isConfirmingTerminate ? (
            <TintedCard
              fill={colors.errorContainer}
              padding={space.lg}
              spacing={space.md}
            >
              <Column spacing={2}>
                <Text
                  textStyle={{
                    ...font.section,
                    color: textColor(colors.onErrorContainer),
                  }}
                >
                  Terminate this Workout?
                </Text>
                <Text
                  textStyle={{
                    fontSize: 15,
                    color: textColor(colors.onErrorContainer),
                  }}
                >
                  {`${workout.progress.done} of ${workout.progress.total} planned Sets are logged. Logged Sets are kept.`}
                </Text>
              </Column>
              <Row spacing={space.sm}>
                <PillChip
                  label="Terminate Workout"
                  selected
                  onPress={() => end('terminate')}
                />
                <PillChip
                  label="Keep going"
                  onPress={() => setIsConfirmingTerminate(false)}
                />
              </Row>
            </TintedCard>
          ) : null}
          {errorMessage ? (
            <TintedCard fill={colors.errorContainer} padding={space.lg}>
              <Text
                textStyle={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: textColor(colors.onErrorContainer),
                }}
              >
                {errorMessage}
              </Text>
            </TintedCard>
          ) : null}
        </Column>
      ) : null}
      {workout.note ? (
        <InfoRow
          icon={NOTE_ICON}
          text={workout.note}
          onPress={() => setNoteTarget({ kind: 'workout' })}
        />
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
          {partners.length > 0 ? (
            <TintedCard fill={colors.secondaryContainer} padding={space.md}>
              <Row alignment="center" spacing={space.md}>
                <Column spacing={2} modifiers={fillRowWidth()}>
                  <Text
                    textStyle={{
                      ...font.label,
                      fontWeight: '700',
                      color: textColor(colors.onSecondaryContainer),
                    }}
                  >
                    {`Alternating sets · Round ${roundNumber(workout, exercise._id) ?? (block?.roundsCompleted ?? 0) + 1}`}
                  </Text>
                  <Text
                    textStyle={{
                      ...font.caption,
                      color: textColor(colors.onSecondaryContainer),
                    }}
                  >
                    {`With ${partners.map((partner) => partner.name).join(', ')}`}
                  </Text>
                </Column>
                {stayOn !== null && workout.exercises[stayOn] ? (
                  <PillChip
                    label={`Stay on ${workout.exercises[stayOn].name}`}
                    onPress={() => {
                      setSelectedIndex(stayOn);
                      setStayOn(null);
                    }}
                  />
                ) : canSkipForNow(workout, exercise._id) ? (
                  <PillChip
                    label="Skip for now"
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
            </TintedCard>
          ) : null}
          {exercise.standingNote ? (
            <InfoRow
              icon={PIN_ICON}
              text={exercise.standingNote}
              onPress={() =>
                setNoteTarget({
                  kind: 'exercise',
                  workoutExerciseId: exercise._id,
                })
              }
            />
          ) : null}
          {usesMachineSetup && exercise.machineSetup ? (
            <InfoRow
              icon={NOTE_ICON}
              text={setupSummary(exercise.machineSetup)}
              actionLabel="Edit setup"
              onPress={() => setSetupFor(exercise._id)}
            />
          ) : null}
          <QuickActionRow
            leading={
              group ? (
                <GroupChip
                  members={group.members}
                  onPress={() => setGroupOpen(true)}
                />
              ) : null
            }
            actions={settings.quickActions}
            badges={{
              note:
                exercise.sets.filter((set) => set.note !== null).length +
                (exercise.standingNote ? 1 : 0),
            }}
            handlers={{
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
                hasNote: set.note !== null,
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
            showHint={!settings.swipeHintDismissed}
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
            onNote={(setId) =>
              setNoteTarget({
                kind: 'set',
                workoutExerciseId: exercise._id,
                setId,
              })
            }
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
            onDismissHint={() =>
              attempt(
                () => updateSettings({ swipeHintDismissed: true }),
                'Could not dismiss the hint.'
              )
            }
          />
          <Row>
            <PillChip
              label="Warm-up Set"
              onPress={() =>
                attempt(
                  () =>
                    addSet({ workoutExerciseId: exercise._id, type: 'warmup' }),
                  'Could not add a Warm-up Set.'
                )
              }
            />
          </Row>
        </>
      ) : (
        <TintedCard
          fill={colors.surfaceContainer}
          padding={20}
          spacing={space.md}
        >
          <Text
            textStyle={{
              fontSize: 20,
              fontWeight: '700',
              color: textColor(colors.onSurface),
            }}
          >
            No Exercises yet
          </Text>
          <Text
            textStyle={{
              fontSize: 15,
              color: textColor(colors.onSurfaceVariant),
            }}
          >
            Add an Exercise to start logging Sets.
          </Text>
          <Row>
            <PillChip
              label="Add Exercise"
              onPress={() => setPickerMode('add')}
            />
          </Row>
        </TintedCard>
      )}
      <BottomSheet
        isPresented={isMenuOpen}
        onDismiss={() => setIsMenuOpen(false)}
      >
        <Column
          spacing={space.lg}
          style={{ paddingHorizontal: space.screen, paddingVertical: space.lg }}
        >
          <SectionHeader title="Workout menu" />
          <Card divided>
            <CardRow
              onPress={() => {
                setIsMenuOpen(false);
                setPickerMode('add');
              }}
            >
              Add Exercise
            </CardRow>
            {allDone ? (
              <CardRow
                onPress={() => {
                  setIsMenuOpen(false);
                  void end('finish');
                }}
              >
                Finish Workout
              </CardRow>
            ) : null}
            <CardRow
              chevron
              onPress={() => {
                setIsMenuOpen(false);
                router.push('/workout/group');
              }}
            >
              Group
            </CardRow>
            <CardRow
              onPress={() => {
                setIsMenuOpen(false);
                setIsConfirmingTerminate(true);
              }}
            >
              <Text
                textStyle={{ ...font.body, color: textColor(colors.error) }}
              >
                Terminate Workout
              </Text>
            </CardRow>
          </Card>
          <Row>
            <PillChip label="Keep going" onPress={() => setIsMenuOpen(false)} />
          </Row>
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
        key={`setup-${setupFor ?? 'closed'}`}
        onActivity={stillWorkingOut.markActive}
        exercise={
          workout.exercises.find((item) => item._id === setupFor) ?? null
        }
        onDismiss={() => setSetupFor(null)}
      />
      <PlatesSheet
        key={isPlatesOpen ? 'plates-open' : 'plates-closed'}
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
    </WorkoutFrame>
  );
}
