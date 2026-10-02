import { Gauge, Text } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  gaugeStyle,
  monospacedDigit,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import type { RestRingProps } from './rest-ring';

/** A draining circular-capacity Gauge with the remaining time inside. */
export function RestRing({ fraction, label, color }: Readonly<RestRingProps>) {
  return (
    <Gauge
      value={fraction}
      modifiers={[gaugeStyle('circularCapacity'), tint(color)]}
      currentValueLabel={
        <Text
          modifiers={[
            font({ textStyle: 'caption', weight: 'semibold' }),
            monospacedDigit(),
            foregroundStyle(color),
          ]}
        >
          {label}
        </Text>
      }
    />
  );
}
