import { Host } from '@expo/ui/jetpack-compose';
import { View } from 'react-native';

import { useAppearance } from '@/lib/ui';
import { ChartView, type ChartViewProps } from '@/modules/benchmrk-ui';
import type { ChartProps } from './chart-types';

const EMPTY_BARS: ChartViewProps['bars'] = [];
const EMPTY_POINTS: ChartViewProps['points'] = [];

/** Android's shared chart contract, drawn by the local Compose Canvas view. */
export function Chart(props: ChartProps) {
  const { resolvedAppearance } = useAppearance();
  const horizontal = props.kind === 'stackedBar' && (props.horizontal ?? false);
  const height = props.height ?? (horizontal ? 28 : 180);
  const style = { height };

  return (
    <View accessible accessibilityLabel={props.summary} style={style}>
      <Host colorScheme={resolvedAppearance} style={style}>
        <ChartView
          kind={props.kind}
          horizontal={horizontal}
          bars={props.kind === 'stackedBar' ? props.bars : EMPTY_BARS}
          points={props.kind === 'stackedBar' ? EMPTY_POINTS : props.points}
          tone={
            props.kind === 'stackedBar' ? 'accent' : (props.tone ?? 'accent')
          }
          referenceValue={
            props.kind === 'trend' ? (props.reference?.value ?? null) : null
          }
          summary={props.summary}
        />
      </Host>
    </View>
  );
}
