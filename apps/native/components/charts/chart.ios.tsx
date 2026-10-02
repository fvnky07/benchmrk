import { Host, Chart as SwiftChart } from '@expo/ui/swift-ui';
import { accessibilityHidden } from '@expo/ui/swift-ui/modifiers';
import { View } from 'react-native';

import { useAppearance } from '@/lib/ui';
import { BENCHMRK_ACCENT } from '@/lib/ui/accent';
import { StackedBarChart } from '@/modules/benchmrk-ui';
import type { ChartProps, ChartTone } from './chart-types';

const TONE_COLORS: Record<ChartTone, Record<'light' | 'dark', string>> = {
  accent: BENCHMRK_ACCENT,
  secondary: { light: '#007AFF', dark: '#0A84FF' },
  tertiary: { light: '#FF9500', dark: '#FF9F0A' },
  neutral: { light: '#8E8E93', dark: '#8E8E93' },
};

/**
 * One VoiceOver summary, with the native plot hidden from accessibility.
 * Horizontal stacked bars default to 28 points; other plots to 180 points.
 * Wrap in RNHostView when embedding in an Expo UI layout.
 */
export function Chart(props: ChartProps) {
  const { resolvedAppearance } = useAppearance();
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
                color: TONE_COLORS[segment.tone][resolvedAppearance],
              })),
            }))}
          />
        ) : (
          <SwiftChart
            type={props.kind === 'bar' ? 'bar' : 'line'}
            data={props.points.map((point) => ({
              x: point.label,
              y: point.value,
              color: TONE_COLORS[props.tone ?? 'accent'][resolvedAppearance],
            }))}
            showGrid
            showLegend={false}
            lineStyle={
              props.kind === 'trend'
                ? {
                    pointStyle: 'circle',
                    color:
                      TONE_COLORS[props.tone ?? 'accent'][resolvedAppearance],
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
                    color: TONE_COLORS.neutral[resolvedAppearance],
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
