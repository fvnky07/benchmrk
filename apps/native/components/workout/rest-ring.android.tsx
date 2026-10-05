import { Box, CircularProgressIndicator, Text } from '@expo/ui/jetpack-compose';
import { size } from '@expo/ui/jetpack-compose/modifiers';

import { textColor } from '@/lib/ui';
import type { RestRingProps } from './rest-ring';

const RING_SIZE = 52;

/** A determinate CircularProgressIndicator with the remaining time inside. */
export function RestRing({ fraction, label, color }: Readonly<RestRingProps>) {
  return (
    <Box contentAlignment="center" modifiers={[size(RING_SIZE, RING_SIZE)]}>
      <CircularProgressIndicator
        progress={fraction}
        color={color}
        modifiers={[size(RING_SIZE, RING_SIZE)]}
      />
      <Text style={{ typography: 'labelMedium' }} color={textColor(color)}>
        {label}
      </Text>
    </Box>
  );
}
