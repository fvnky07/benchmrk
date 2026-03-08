import { View } from 'react-native';

import { Text } from '@/components/ui/text';

interface StatItemProps {
  readonly label: string;
  readonly value: number;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <View className="items-center">
      <Text className="font-bold text-base text-foreground">
        {value.toLocaleString()}
      </Text>
      <Text className="text-muted-foreground text-xs">{label}</Text>
    </View>
  );
}

interface UserStatsRowProps {
  readonly workouts: number;
  readonly followers: number;
  readonly following: number;
}

export function UserStatsRow({
  workouts,
  followers,
  following,
}: UserStatsRowProps) {
  return (
    <View className="mt-2 flex-row justify-around">
      <StatItem label="Workouts" value={workouts} />
      <StatItem label="Followers" value={followers} />
      <StatItem label="Following" value={following} />
    </View>
  );
}
