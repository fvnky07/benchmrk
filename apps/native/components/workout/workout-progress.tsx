import { View } from 'react-native';

import { useAppearance } from '@/lib/ui';

/** Planned Sets completed; the web adapter draws a plain accessible bar. */
export function WorkoutProgress({ fraction }: Readonly<{ fraction: number }>) {
  const { colors } = useAppearance().navigationTheme;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
      style={{ height: 6, borderRadius: 3, backgroundColor: colors.border }}
    >
      <View
        style={{
          height: 6,
          borderRadius: 3,
          width: `${Math.round(fraction * 100)}%`,
          backgroundColor: colors.primary,
        }}
      />
    </View>
  );
}
