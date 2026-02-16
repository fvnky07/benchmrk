import { View } from 'react-native';

import { useColorScheme } from 'nativewind';

import { Text } from '@/components/ui/text';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Placeholder data — minutes spent working out each day
const PLACEHOLDER_DATA = [45, 0, 60, 30, 0, 90, 20];
const MAX_VALUE = Math.max(...PLACEHOLDER_DATA, 1);

/**
 * Weekly workout statistics bar chart placeholder
 *
 * TODO: Replace with real chart library and live data after MVP.
 * Will show time spent working out per day of the week.
 */
export function StatisticsCard() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const accentColor = isDark ? '#22c55e' : '#16a34a';
  const emptyColor = isDark
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(0, 0, 0, 0.06)';

  return (
    <View className="rounded-xl border border-border bg-card p-4">
      <Text className="mb-1 text-sm font-semibold text-foreground">
        Weekly Statistics
      </Text>
      <Text className="mb-4 text-xs text-muted-foreground">
        Time spent working out (min)
      </Text>

      {/* Bar chart */}
      <View className="flex-row items-end justify-between" style={{ height: 120 }}>
        {DAYS.map((day, i) => {
          const value = PLACEHOLDER_DATA[i] ?? 0;
          const barHeight = value > 0 ? (value / MAX_VALUE) * 100 : 4;

          return (
            <View key={day} className="flex-1 items-center">
              {/* Value label */}
              {value > 0 && (
                <Text className="mb-1 text-[10px] text-muted-foreground">
                  {value}
                </Text>
              )}

              {/* Bar */}
              <View
                style={{
                  height: barHeight,
                  width: '60%',
                  borderRadius: 4,
                  backgroundColor: value > 0 ? accentColor : emptyColor,
                }}
              />

              {/* Day label */}
              <Text className="mt-2 text-[10px] text-muted-foreground">
                {day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
