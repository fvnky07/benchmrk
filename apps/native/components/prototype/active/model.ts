// PROTOTYPE — throwaway (prototype/workout-ui branch).
// The seam between the Active Workout route (queries, mutations, state,
// handlers, sheets) and its interchangeable presentations.
import type { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import type { EffortScale } from '@repo/backend/convex/domain/effort';
import type { WeightUnit } from '@repo/backend/convex/domain/units';
import type { MemberSettings } from '@repo/backend/convex/memberSettings';
import type { FunctionReturnType } from 'convex/server';

import type { StripExercise } from '@/components/workout/exercise-strip';
import type { TitlePage } from '@/components/workout/exercise-title-pager';
import type { SetTableSet } from '@/components/workout/set-table';
import type { QuickActionId } from '@/lib/workout/quick-actions';
import type { ActiveWorkout } from '@/lib/workout/rounds';
import type { KeypadKey, SetField } from '@/lib/workout/set-entry';

export type WorkoutExercise = ActiveWorkout['exercises'][number];
export type WorkoutSet = WorkoutExercise['sets'][number];
export type Focus = { setId: Id<'sets'>; field: SetField };
export type MemberGroup = NonNullable<
  FunctionReturnType<typeof api.groups.getMine>
>;

/** One Exercise's Set table, projected exactly as `SetTable` takes it. */
export type ExerciseTable = Readonly<{
  sets: readonly SetTableSet[];
  /** "1", "2", "W", … one per Set, in order. */
  labels: readonly string[];
  /** Column headings for the value cells, e.g. "kg" and "Reps". */
  headings: readonly string[];
  fields: readonly SetField[];
  /** "Target", or "Last time" for timed and cardio Exercises. */
  targetHeading: 'Target' | 'Last time';
}>;

/** The selected Exercise's Alternating sets block. */
export type Alternating = Readonly<{
  /** "Alternating sets · Round 2" */
  roundLabel: string;
  /** "With Squat, Lunge" */
  withNames: string;
  /** After an auto-advance within a round: the Exercise to stay on. */
  stayOnName: string | null;
  canSkipForNow: boolean;
}>;

/** Everything a presentation reads. Pure data and derived values. */
export type ActiveModel = Readonly<{
  workout: ActiveWorkout;
  settings: MemberSettings;
  /** undefined while loading, null when the member has no Group. */
  group: MemberGroup | null | undefined;
  now: number;
  elapsedSeconds: number;
  units: WeightUnit;
  effortScale: EffortScale;

  /** The selected Exercise (always valid when there are Exercises). */
  index: number;
  exercise: WorkoutExercise | undefined;
  /** The selected Exercise's Set table; null without an Exercise. */
  table: ExerciseTable | null;
  /** Any Exercise's Set table (for presentations showing several). */
  tableFor: (exercise: WorkoutExercise) => ExerciseTable;
  strip: StripExercise[];
  titlePages: TitlePage[];
  alternating: Alternating | null;
  /** The rest the selected Exercise (or its Alternating sets block) plans. */
  plannedRestSeconds: number;
  /** Machine setup summary; null when it doesn't apply or isn't saved. */
  machineSetup: string | null;
  /** Counts shown on quick action chips (the Note chip). */
  quickActionBadges: Partial<Record<QuickActionId, number>>;

  progressFraction: number;
  allDone: boolean;
  /** "3 min ahead"; null when the member hides it or there's no target. */
  aheadBehind: string | null;
  /** 20 minutes without activity. */
  isIdle: boolean;
  isConfirmingTerminate: boolean;
  errorMessage: string | null;

  /** The Set and field the keypad types into (chosen cell, else next Set). */
  focus: Focus | null;
  focusSet: WorkoutSet | undefined;
  isKeypadOpen: boolean;
  /** "Set 2 · Weight": what the keys type into; null without a focus. */
  keypadTarget: string | null;
  /** The per-side plate breakdown while a barbell weight is edited. */
  plateStrip: string | null;
}>;

/** Every semantic action a presentation can trigger. */
export type ActiveActions = Readonly<{
  // Exercises
  selectExercise: (index: number) => void;
  openAddExercise: () => void;
  openStructure: () => void;
  // Workout
  openMenu: () => void;
  openGroup: () => void;
  openGroupDrawer: () => void;
  openWorkoutNote: () => void;
  askTerminate: () => void;
  cancelTerminate: () => void;
  terminate: () => void;
  finish: () => void;
  /** Ends at the last logged Set: finish when all done, else terminate. */
  finishNow: () => void;
  keepGoing: () => void;
  // Rest
  adjustRest: (seconds: number) => void;
  skipRest: () => void;
  resetRest: () => void;
  openRestOptions: () => void;
  // Alternating sets
  stayOn: () => void;
  skipForNow: () => void;
  // Selected Exercise
  openExerciseNote: () => void;
  editSetup: () => void;
  /** The quick action chips that apply right now. */
  quick: Partial<Record<QuickActionId, () => void>>;
  addWarmupSet: () => void;
  openPlates: () => void;
  // Sets
  focusCell: (setId: Id<'sets'>, field: SetField) => void;
  /** Selects the Exercise, then focuses one of its cells. */
  focusCellOf: (
    exerciseIndex: number,
    setId: Id<'sets'>,
    field: SetField
  ) => void;
  fillFromTarget: (setId: Id<'sets'>, field: SetField) => void;
  /** Logs (done) or un-logs a Set of any Exercise. */
  toggleDone: (row: SetTableSet, done: boolean) => void;
  openSetNote: (setId: Id<'sets'>) => void;
  duplicateSet: (setId: Id<'sets'>) => void;
  deleteSet: (setId: Id<'sets'>) => void;
  openSetType: (setId: Id<'sets'>) => void;
  /** Why this target; the selected Exercise's unless one is given. */
  openTarget: (workoutExerciseId?: Id<'workoutExercises'>) => void;
  dismissSwipeHint: () => void;
  // Keypad (types into `focus`)
  pressKey: (key: KeypadKey) => void;
  step: (direction: 1 | -1) => void;
  rate: (rpe: number | null) => void;
  toggleScale: () => void;
  toggleFailure: () => void;
  /** Logs the focused Set. */
  logFocused: () => void;
  hideKeypad: () => void;
  showKeypad: () => void;
}>;

export type ActiveVariantProps = Readonly<{
  model: ActiveModel;
  actions: ActiveActions;
}>;
