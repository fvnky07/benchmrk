import { ScrollView, View, Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';

const iconColor = '#00ff90';

/**
 * Workout screen - Main workout tracking interface
 *
 * Features:
 * - Start new workout
 * - View workout history
 * - Quick workout templates
 * - Active workout session
 */
export default function WorkoutScreen() {
  const handleStartWorkout = () => {
    console.log('Start new workout - Coming soon');
  };

  const handleViewHistory = () => {
    console.log('View workout history - Coming soon');
  };

  const handleViewTemplates = () => {
    console.log('View workout templates - Coming soon');
  };

  return (
    <SafeAreaView className="flex-1 bg-black-1" edges={['top']}>
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-6">
          <Text className="text-3xl font-bold text-white">Workouts</Text>
          <Text className="mt-1 text-base text-gray-400">
            Track your fitness journey
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="mt-8 px-6">
          <Text className="mb-3 text-xs font-semibold text-white/60">
            QUICK ACTIONS
          </Text>

          {/* Start Workout Button */}
          <Pressable
            className="mb-4 overflow-hidden rounded-xl bg-[#1C1C1E]"
            onPress={handleStartWorkout}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View className="flex-row items-center p-5">
              <View
                className="mr-4 size-12 items-center justify-center rounded-full"
                style={{ backgroundColor: iconColor }}
              >
                <Ionicons name="add" size={28} color="#000" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-white">
                  Start New Workout
                </Text>
                <Text className="mt-0.5 text-sm text-gray-400">
                  Begin tracking your session
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={iconColor} />
            </View>
          </Pressable>

          {/* Workout History */}
          <Pressable
            className="mb-4 h-16 flex-row items-center overflow-hidden rounded-xl bg-[#1C1C1E] px-5"
            onPress={handleViewHistory}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="calendar-outline" size={24} color={iconColor} />
            <Text className="ml-4 flex-1 text-base text-white">
              Workout History
            </Text>
            <Ionicons name="chevron-forward" size={18} color={iconColor} />
          </Pressable>

          {/* Templates */}
          <Pressable
            className="h-16 flex-row items-center overflow-hidden rounded-xl bg-[#1C1C1E] px-5"
            onPress={handleViewTemplates}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="document-text-outline" size={24} color={iconColor} />
            <Text className="ml-4 flex-1 text-base text-white">
              Workout Templates
            </Text>
            <Ionicons name="chevron-forward" size={18} color={iconColor} />
          </Pressable>
        </View>

        {/* Stats Overview */}
        <View className="mt-8 px-6 pb-8">
          <Text className="mb-3 text-xs font-semibold text-white/60">
            THIS WEEK
          </Text>
          <View className="overflow-hidden rounded-xl bg-[#1C1C1E] p-5">
            <View className="flex-row justify-between">
              <View className="flex-1">
                <Text className="text-3xl font-bold text-white">0</Text>
                <Text className="mt-1 text-sm text-gray-400">Workouts</Text>
              </View>
              <View className="flex-1">
                <Text className="text-3xl font-bold text-white">0</Text>
                <Text className="mt-1 text-sm text-gray-400">Minutes</Text>
              </View>
              <View className="flex-1">
                <Text className="text-3xl font-bold text-white">0</Text>
                <Text className="mt-1 text-sm text-gray-400">Exercises</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
