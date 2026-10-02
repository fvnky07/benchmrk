import type { WeightUnit } from '@repo/backend/convex/domain/units';

import { formatClock, parseWeightKg, weightInUnit } from './format';

export type SetType = 'normal' | 'warmup' | 'dropset' | 'failure';

/** Table labels: Working Sets are numbered, Warm-up and Dropset Sets lettered. */
export function setLabels(types: readonly SetType[]): string[] {
  let working = 0;
  return types.map((type) => {
    if (type === 'warmup') return 'W';
    if (type === 'dropset') return 'D';
    working += 1;
    return type === 'failure' ? `${working}F` : String(working);
  });
}

export const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: 'Normal',
  warmup: 'Warm-up',
  dropset: 'Dropset',
  failure: 'Failure',
};
export type SetField = 'weight' | 'reps' | 'duration' | 'distance';
export type ExerciseType = 'strength' | 'bodyweight' | 'timed' | 'cardio';
export type KeypadKey =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '.'
  | 'back';

/** The values a Set logs, by Exercise type. */
export const SET_FIELDS: Record<ExerciseType, readonly SetField[]> = {
  strength: ['weight', 'reps'],
  bodyweight: ['weight', 'reps'],
  timed: ['duration'],
  cardio: ['duration', 'distance'],
};

/** How a field is stored on the Set (kg, whole reps, seconds, metres). */
export type StoredValues = {
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
};

const STORED_KEY: Record<SetField, keyof StoredValues> = {
  weight: 'weightKg',
  reps: 'reps',
  duration: 'durationSeconds',
  distance: 'distanceMeters',
};

const MAX_DRAFT_LENGTH = 7;
const DURATION_STEP_SECONDS = 5;
const DISTANCE_STEP_METERS = 100;

export function storedKey(field: SetField): keyof StoredValues {
  return STORED_KEY[field];
}

/** Applies one keypad key to a draft. Reps and durations take digits only. */
export function typeKey(
  draft: string,
  key: KeypadKey,
  field: SetField
): string {
  if (key === 'back') return draft.slice(0, -1);
  if (key === '.') {
    const takesDecimal = field === 'weight' || field === 'distance';
    if (!takesDecimal || draft.includes('.')) return draft;
    return draft === '' ? '0.' : `${draft}.`;
  }
  if (draft.length >= MAX_DRAFT_LENGTH) return draft;
  return draft === '0' ? key : draft + key;
}

/**
 * Durations are typed as clock digits, like a microwave: the last two digits
 * are seconds, the two before minutes, anything earlier hours ("130" = 1:30).
 */
export function parseClockDigits(digits: string): number | null {
  if (!/^\d+$/.test(digits)) return null;
  const value = Number(digits);
  const seconds = value % 100;
  const minutes = Math.floor(value / 100) % 100;
  const hours = Math.floor(value / 10_000);
  return hours * 3600 + minutes * 60 + seconds;
}

function clockDigits(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return String(hours * 10_000 + minutes * 100 + seconds);
}

/** A typed draft as the value stored on the Set; null when empty or invalid. */
export function draftToStored(
  field: SetField,
  draft: string,
  unit: WeightUnit
): number | null {
  if (draft.trim() === '') return null;
  switch (field) {
    case 'weight':
      return parseWeightKg(draft, unit);
    case 'reps': {
      const reps = Number(draft);
      return Number.isInteger(reps) && reps >= 0 ? reps : null;
    }
    case 'duration':
      return parseClockDigits(draft);
    case 'distance': {
      const kilometres = Number(draft);
      return Number.isFinite(kilometres) && kilometres >= 0
        ? Math.round(kilometres * 1000)
        : null;
    }
  }
}

/** A stored value as the draft a member would have typed. */
export function storedToDraft(
  field: SetField,
  value: number | null,
  unit: WeightUnit
): string {
  if (value === null) return '';
  switch (field) {
    case 'weight':
      return String(weightInUnit(value, unit));
    case 'reps':
      return String(value);
    case 'duration':
      return clockDigits(value);
    case 'distance':
      return String(Number((value / 1000).toFixed(2)));
  }
}

/** A draft as shown in the Set table. */
export function displayDraft(field: SetField, draft: string): string {
  if (field !== 'duration' || draft === '') return draft;
  return formatClock(parseClockDigits(draft) ?? 0);
}

/** One +/− press: weight by the Exercise's step, reps by 1. Never below 0. */
export function steppedValue(
  field: SetField,
  current: number | null,
  direction: 1 | -1,
  stepKg: number
): number {
  const step: Record<SetField, number> = {
    weight: stepKg,
    reps: 1,
    duration: DURATION_STEP_SECONDS,
    distance: DISTANCE_STEP_METERS,
  };
  return Math.max(0, (current ?? 0) + direction * step[field]);
}

export const FIELD_LABELS: Record<SetField, string> = {
  weight: 'Weight',
  reps: 'Reps',
  duration: 'Time',
  distance: 'Distance',
};

/** The Set table column heading for a field. */
export function fieldHeading(field: SetField, unit: WeightUnit): string {
  const headings: Record<SetField, string> = {
    weight: unit,
    reps: 'Reps',
    duration: 'Time',
    distance: 'km',
  };
  return headings[field];
}

/** The part of a Set's Overload target the table shows. */
export type SetTargetValues = { weightKg: number | null; reps: number };

/** A field's Overload target as stored; only weight and reps have targets. */
export const TARGET_VALUE: Record<
  SetField,
  (target: SetTargetValues) => number | null
> = {
  weight: (target) => target.weightKg,
  reps: (target) => target.reps,
  duration: () => null,
  distance: () => null,
};

/** The Target column: "60 × 8", or "8 reps" when there's no weight to aim for. */
export function targetText(target: SetTargetValues, unit: WeightUnit): string {
  return target.weightKg === null
    ? `${target.reps} reps`
    : `${storedToDraft('weight', target.weightKg, unit)} × ${target.reps}`;
}

/** A Set's values in one line: "60 × 8", "8 reps", "1:00" or "5 km · 25:00". */
export function setSummary(set: StoredValues, unit: WeightUnit): string {
  if (set.reps !== null) {
    return targetText({ weightKg: set.weightKg, reps: set.reps }, unit);
  }
  return [
    set.distanceMeters === null
      ? null
      : `${storedToDraft('distance', set.distanceMeters, unit)} km`,
    set.durationSeconds === null ? null : formatClock(set.durationSeconds),
  ]
    .filter((part) => part !== null)
    .join(' · ');
}
