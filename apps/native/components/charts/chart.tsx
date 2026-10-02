import { Text } from '@expo/ui';

import type { ChartProps } from './chart-types';

export function Chart(props: ChartProps) {
  return <Text>{props.summary}</Text>;
}
