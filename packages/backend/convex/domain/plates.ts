import type { WeightUnit } from './units';

/** A member's bar and plates, in the unit their gym's plates are marked in. */
export type PlateInventory = {
  unit: WeightUnit;
  barWeight: number;
  /** Pairs available per plate size. */
  plates: { weight: number; pairs: number }[];
};

const DEFAULT_PAIRS = 4;

const pairsOf = (weights: number[]) =>
  weights.map((weight) => ({ weight, pairs: DEFAULT_PAIRS }));

/** A 20 kg bar with 25–1.25 kg plates, or a 45 lb bar with 45–2.5 lb plates. */
export const DEFAULT_PLATES: Record<WeightUnit, PlateInventory> = {
  kg: {
    unit: 'kg',
    barWeight: 20,
    plates: pairsOf([25, 20, 15, 10, 5, 2.5, 1.25]),
  },
  lb: {
    unit: 'lb',
    barWeight: 45,
    plates: pairsOf([45, 35, 25, 10, 5, 2.5]),
  },
};
