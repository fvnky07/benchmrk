import type { PlateInventory } from '@repo/backend/convex/domain/plates';

/** How a barbell weight loads from the member's bar and plates. */
export type PlateLoad =
  | { kind: 'below'; barWeight: number }
  | {
      kind: 'loaded';
      /** Plates on each side, heaviest first. */
      perSide: number[];
      /** What the plates can't make up, in total; 0 when exact. */
      short: number;
    };

const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Loads each side greedily, heaviest plate first, using no more pairs than
 * the inventory has (the locked prototype's algorithm). `weight` is in the
 * inventory's unit.
 */
export function plateLoad(
  weight: number,
  inventory: PlateInventory
): PlateLoad {
  if (weight < inventory.barWeight - 1e-9) {
    return { kind: 'below', barWeight: inventory.barWeight };
  }
  let remainder = round((weight - inventory.barWeight) / 2);
  const perSide: number[] = [];
  const heaviestFirst = [...inventory.plates].sort(
    (a, b) => b.weight - a.weight
  );
  for (const { weight: plate, pairs } of heaviestFirst) {
    for (let used = 0; used < pairs && remainder >= plate - 1e-9; used += 1) {
      perSide.push(plate);
      remainder = round(remainder - plate);
    }
  }
  return {
    kind: 'loaded',
    perSide,
    short: remainder < 0.001 ? 0 : round(remainder * 2),
  };
}

/**
 * The strip above the keypad: "20 kg bar + 25 + 5 + 2.5 per side", with what
 * the plates can't make up, or "Below the 20 kg bar".
 */
export function plateStrip(weight: number, inventory: PlateInventory): string {
  const load = plateLoad(weight, inventory);
  const { unit, barWeight } = inventory;
  if (load.kind === 'below') return `Below the ${barWeight} ${unit} bar`;
  const plates =
    load.perSide.length === 0
      ? `Just the ${barWeight} ${unit} bar`
      : `${barWeight} ${unit} bar + ${load.perSide.join(' + ')} per side`;
  return load.short > 0 ? `${plates} · ${load.short} ${unit} short` : plates;
}
