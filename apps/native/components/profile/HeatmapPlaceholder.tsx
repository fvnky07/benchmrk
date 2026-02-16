import { View } from 'react-native';

import { useColorScheme } from 'nativewind';

import { Text } from '@/components/ui/text';

const WEEKS = 15;
const DAYS = 7;

/**
 * Visual heatmap placeholder grid
 *
 * TODO: Replace with real activity heatmap after MVP.
 * Will show workout frequency per day over time.
 */
export function HeatmapPlaceholder() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Generate placeholder cells with random-ish opacity
  const cells = Array.from({ length: WEEKS * DAYS }, (_, i) => {
    // Deterministic pseudo-random opacity based on index
    const seed = ((i * 7 + 13) % 17) / 17;
    const hasActivity = seed > 0.5;
    return hasActivity ? seed : 0;
  });

  return (
    <View className="rounded-lg border border-border bg-card p-3">
      <Text className="mb-2 text-xs font-medium text-muted-foreground">
        Activity
      </Text>
      <View className="flex-row flex-wrap gap-[3px]">
        {cells.map((opacity, i) => (
          <View
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor:
                opacity > 0
                  ? isDark
                    ? `rgba(34, 197, 94, ${opacity * 0.8})`
                    : `rgba(22, 163, 74, ${opacity * 0.8})`
                  : isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(0, 0, 0, 0.06)',
            }}
          />
        ))}
      </View>
    </View>
  );
}
