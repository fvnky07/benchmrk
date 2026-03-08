import { useColorScheme } from 'nativewind';
import { ScrollView, View } from 'react-native';

import { HeatmapPlaceholder } from '@/components/profile/HeatmapPlaceholder';
import { StatisticsCard } from '@/components/profile/StatisticsCard';
import { UserStatsRow } from '@/components/profile/UserStatsRow';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { useUserProfile } from '@/lib/hooks/use-user-profile';

// TODO: Replace with real Convex useQuery data
const PLACEHOLDER_STATS = {
  workouts: 165,
  followers: 1234,
  following: 567,
};

export default function ProfileScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { username, bio, avatarUrl, initials } = useUserProfile();

  // TODO: Replace with Convex useQuery for completed workouts
  // const workouts = useQuery(api.workouts.getUserWorkouts, { userId: user?.id });
  const workouts: unknown[] = [];

  return (
    <ScrollView
      className={isDark ? 'bg-black-1' : 'bg-white'}
      contentContainerClassName="pb-12"
    >
      {/* ── Row 1: Avatar + Username + Stats ── */}
      <View className="flex-row items-center px-4 pt-4">
        {/* Left column: Avatar */}
        <Avatar className="size-24 rounded-md" alt={`${username}'s avatar`}>
          {avatarUrl ? <AvatarImage source={{ uri: avatarUrl }} /> : null}
          <AvatarFallback>
            <Text className="font-semibold text-foreground text-lg">
              {initials}
            </Text>
          </AvatarFallback>
        </Avatar>

        {/* Right column: Username + Stats */}
        <View className="ml-4 flex-1">
          {/* Top row: Username */}
          <Text className="font-bold text-foreground text-xl">{username}</Text>

          {/* Bottom row: Workouts, Followers, Following */}
          <UserStatsRow
            workouts={PLACEHOLDER_STATS.workouts}
            followers={PLACEHOLDER_STATS.followers}
            following={PLACEHOLDER_STATS.following}
          />
        </View>
      </View>

      {/* ── Row 2: Bio + Heatmap ── */}
      <View className="mt-4 px-4">
        {bio ? (
          <View className="flex-row gap-3">
            {/* Bio — flex-1 */}
            <View className="flex-1 rounded-lg border-2 border-border bg-card p-3">
              <Text className="font-medium text-muted-foreground text-xs">
                Bio
              </Text>
              <Text className="mt-1 text-foreground text-sm">{bio}</Text>
            </View>

            {/* Heatmap — flex-[2] */}
            <View style={{ flex: 2 }}>
              <HeatmapPlaceholder />
            </View>
          </View>
        ) : (
          /* No bio — heatmap takes full width */
          <HeatmapPlaceholder />
        )}
      </View>

      {/* ── Row 3: Weekly Statistics ── */}
      <View className="mt-4 px-4">
        <StatisticsCard />
      </View>

      {/* ── Row 4: Completed Workouts Feed (placeholder) ── */}
      <View className="mt-4 px-4">
        <View className="rounded-xl border border-border bg-card p-4">
          <Text className="font-semibold text-foreground text-sm">
            Recent Workouts
          </Text>
          <Text className="mt-1 text-muted-foreground text-xs">
            Completed workouts will appear here
          </Text>

          {/* TODO: Map over Convex useQuery results */}
          {workouts.length === 0 ? (
            <View className="mt-4 items-center py-8">
              <Text className="text-muted-foreground text-sm">
                No workouts yet
              </Text>
              <Text className="mt-1 text-muted-foreground text-xs">
                Complete a workout to see it here
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}
