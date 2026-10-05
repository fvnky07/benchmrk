import { Host, Chart as SwiftChart } from '@expo/ui/swift-ui';
import { accessibilityHidden } from '@expo/ui/swift-ui/modifiers';
import { View } from 'react-native';

import { type AppColors, useAppearance, useColors } from '@/lib/ui';
import { StackedBarChart } from '@/modules/benchmrk-ui';
import type { ChartProps, ChartTone } from './chart-types';

const TONE_ROLES = {
  accent: 'primary',
  secondary: 'secondary',
  tertiary: 'tertiary',
  neutral: 'outline',
} as const satisfies Record<ChartTone, keyof AppColors>;

/**
 * One VoiceOver summary, with the native plot hidden from accessibility.
 * Horizontal stacked bars default to 28 points; other plots to 180 points.
 * Wrap in RNHostView when embedding in an Expo UI layout.
 */
export function Chart(props: ChartProps) {
  const { resolvedAppearance } = useAppearance();
  const colors = useColors();
  const height =
    props.height ??
    (props.kind === 'stackedBar' && props.horizontal ? 28 : 180);

  return (
    <View
      accessible
      accessibilityLabel={props.summary}
      accessibilityRole="image"
      style={{ height, width: '100%' }}
    >
      <Host
        colorScheme={resolvedAppearance}
        modifiers={[accessibilityHidden(true)]}
        style={{ height, width: '100%' }}
      >
        {props.kind === 'stackedBar' ? (
          <StackedBarChart
            horizontal={props.horizontal ?? false}
            bars={props.bars.map((bar) => ({
              label: bar.label,
              segments: bar.segments.map((segment) => ({
                label: segment.label,
                value: segment.value,
                color: colors[TONE_ROLES[segment.tone]],
              })),
            }))}
          />
        ) : (
          <SwiftChart
            type={props.kind === 'bar' ? 'bar' : 'line'}
            data={props.points.map((point) => ({
              x: point.label,
              y: point.value,
              color: colors[TONE_ROLES[props.tone ?? 'accent']],
            }))}
            showGrid
            showLegend={false}
            lineStyle={
              props.kind === 'trend'
                ? {
                    pointStyle: 'circle',
                    color: colors[TONE_ROLES[props.tone ?? 'accent']],
                  }
                : undefined
            }
            referenceLines={
              props.kind === 'trend' && props.reference
                ? [{ x: props.reference.label, y: props.reference.value }]
                : undefined
            }
            ruleStyle={
              props.kind === 'trend' && props.reference
                ? {
                    color: colors[TONE_ROLES.neutral],
                    lineWidth: 1,
                    dashArray: [4, 4],
                  }
                : undefined
            }
          />
        )}
      </Host>
    </View>
  );
}
