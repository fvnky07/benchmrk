import { Feather } from '@expo/vector-icons';
import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { useColorScheme } from 'nativewind';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { WorkoutFeedCard } from '@/components/workout';
import { useUserProfile } from '@/lib/hooks/use-user-profile';

export default function HomeScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { username } = useUserProfile();
  const workouts = useQuery(api.workouts.getRecentWorkoutsWithProfiles, {
    limit: 20,
  });

  const isLoading = workouts === undefined;

  return (
    <SafeAreaView
      className={isDark ? 'flex-1 bg-black-1' : 'flex-1 bg-white'}
      edges={['top']}
    >
      <FlatList
        data={workouts ?? []}
        keyExtractor={(item) => item._id}
        contentContainerClassName="px-4 pb-8"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="mb-6 mt-2">
            <Text className="text-sm text-white/50">Welcome back,</Text>
            <Text className="font-bold text-3xl text-white">{username}</Text>

            <View className="mt-5 flex-row gap-3">
              <View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-white/10 bg-black-2 px-4 py-3">
                <Feather name="users" size={16} color="#3CD5E6" />
                <Text className="font-bold text-white">2,847</Text>
                <Text className="text-xs text-white/50">athletes</Text>
              </View>
              <View className="flex-1 flex-row items-center gap-2 rounded-2xl border border-white/10 bg-black-2 px-4 py-3">
                <Feather name="activity" size={16} color="#00ff90" />
                <Text className="font-bold text-white">12.4k</Text>
                <Text className="text-xs text-white/50">workouts</Text>
              </View>
            </View>

            <View className="mt-6 flex-row items-center gap-2">
              <Feather name="radio" size={16} color="#00ff90" />
              <Text className="font-semibold text-lg text-white">
                Community Feed
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => <WorkoutFeedCard workout={item} />}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center justify-center py-16">
              <ActivityIndicator size="large" color="#00ff90" />
            </View>
          ) : (
            <View className="items-center justify-center rounded-2xl border border-white/10 bg-black-2 py-16">
              <Feather
                name="activity"
                size={40}
                color="rgba(255,255,255,0.2)"
              />
              <Text className="mt-4 text-lg text-white/40">
                No workouts yet
              </Text>
              <Text className="mt-1 text-sm text-white/30">
                Be the first to post!
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
