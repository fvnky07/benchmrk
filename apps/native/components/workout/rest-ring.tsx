import { Text } from '@expo/ui';
import type { ColorValue } from 'react-native';

export type RestRingProps = {
  /** Remaining share of the rest, 1 → 0. */
  fraction: number;
  /** Remaining time, e.g. "1:05". */
  label: string;
  color: ColorValue;
};

/** Without a native ring (web, tests) only the remaining time shows. */
export function RestRing({ label }: Readonly<RestRingProps>) {
  return <Text textStyle={{ fontSize: 15, fontWeight: '600' }}>{label}</Text>;
}
