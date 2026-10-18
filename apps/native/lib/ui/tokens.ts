import type { TextProps } from '@expo/ui';

type TextStyle = NonNullable<TextProps['textStyle']>;

/** 8pt rhythm (DESIGN.md). `screen` is the horizontal screen inset. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  screen: 24,
} as const;

/** Controls 10, grouped cards 16, docks/sheets 24, chips/badges pill. */
export const radius = { control: 10, card: 16, dock: 24, pill: 999 } as const;

/** Fixed control sizes (pt/dp). */
export const size = {
  touch: 44,
  button: 52,
  chip: 36,
  badge: 36,
  cell: 64,
  cellHeight: 44,
  key: 48,
  tile: 72,
  avatar: 96,
} as const;

/** System font; weights/sizes only. Pair with `textColor(colors.*)`. */
export const font = {
  /** Header-less screen title. */
  title: { fontSize: 32, fontWeight: '700' },
  /** In-content heading (exercise/workout name). */
  heading: { fontSize: 22, fontWeight: '700' },
  /** `SectionHeader`. */
  section: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 16 },
  bodyStrong: { fontSize: 16, fontWeight: '600' },
  /** Field labels, chips, table headings (13 variant inline). */
  label: { fontSize: 14, fontWeight: '600' },
  /** Supporting/muted copy. */
  caption: { fontSize: 13 },
  /** `StatTile` numbers (tabular). */
  stat: { fontSize: 28, fontWeight: '700' },
  /** Keypad keys. */
  key: { fontSize: 22, fontWeight: '500' },
  /** `PrimaryButton` label. */
  button: { fontSize: 17, fontWeight: '600' },
} as const satisfies Record<string, TextStyle>;
