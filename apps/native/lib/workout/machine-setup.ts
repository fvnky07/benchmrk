export type MachinePositions = {
  seat?: number;
  back?: number;
  pin?: number;
  angle?: number;
};

export type MachineSetup = {
  positions: MachinePositions;
  custom: { label: string; value: string }[];
};

/** The labelled positions, in the order the sheet and summary show them. */
export const POSITIONS: Record<
  keyof MachinePositions,
  { short: string; label: string; step: number; min: number; suffix: string }
> = {
  seat: { short: 'Seat', label: 'Seat height', step: 1, min: 1, suffix: '' },
  back: { short: 'Back', label: 'Back pad', step: 1, min: 1, suffix: '' },
  pin: { short: 'Pin', label: 'Pin', step: 1, min: 1, suffix: '' },
  angle: {
    short: 'Angle',
    label: 'Bench angle',
    step: 15,
    min: 0,
    suffix: '°',
  },
};

export const POSITION_KEYS = Object.keys(
  POSITIONS
) as (keyof MachinePositions)[];

/** The compact line under the Exercise title: "Seat 4 · Back 2 · Pin 7". */
export function setupSummary(setup: MachineSetup): string {
  return [
    ...POSITION_KEYS.flatMap((key) => {
      const value = setup.positions[key];
      const { short, suffix } = POSITIONS[key];
      return value === undefined ? [] : [`${short} ${value}${suffix}`];
    }),
    ...setup.custom.map((field) => `${field.label} ${field.value}`),
  ].join(' · ');
}
