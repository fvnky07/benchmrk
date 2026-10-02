import type { Doc } from '@repo/backend/convex/_generated/dataModel';

export type ExerciseType = Doc<'exercises'>['type'];
export type Equipment = Doc<'exercises'>['equipment'];

export const EXERCISE_TYPE_LABEL: Record<ExerciseType, string> = {
  strength: 'Strength',
  bodyweight: 'Bodyweight',
  timed: 'Timed',
  cardio: 'Cardio',
};

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  machine: 'Machine',
  cable: 'Cable',
  bodyweight: 'Bodyweight',
  other: 'Other',
};
