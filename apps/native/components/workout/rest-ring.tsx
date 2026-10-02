import { Text } from '@expo/ui';

export type RestRingProps = {
  /** Remaining share of the rest, 1 → 0. */
  fraction: number;
  /** Remaining time, e.g. "1:05". */
  label: string;
  color: string;
};

/** Without a native ring (web, tests) only the remaining time shows. */
export function RestRing({ label }: Readonly<RestRingProps>) {
  return <Text textStyle={{ fontSize: 15, fontWeight: '600' }}>{label}</Text>;
}
