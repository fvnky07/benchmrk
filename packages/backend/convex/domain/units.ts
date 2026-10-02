export type WeightUnit = 'kg' | 'lb';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'other';

/** Exact kilograms in one avoirdupois pound. */
export const KG_PER_LB = 0.45359237;

/**
 * Default weight step per equipment in each unit. Cable and other use the
 * machine step; bodyweight added load uses the barbell step.
 */
const DEFAULT_STEP: Record<Equipment, Record<WeightUnit, number>> = {
  barbell: { kg: 2.5, lb: 5 },
  dumbbell: { kg: 1, lb: 2 },
  machine: { kg: 5, lb: 10 },
  cable: { kg: 5, lb: 10 },
  other: { kg: 5, lb: 10 },
  bodyweight: { kg: 2.5, lb: 5 },
};

export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}

/** The default weight step, stored in kg, for equipment in the member's unit. */
export function defaultStepKg(equipment: Equipment, unit: WeightUnit): number {
  return toKg(DEFAULT_STEP[equipment][unit], unit);
}
