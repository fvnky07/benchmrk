import {
  Dumbbell,
  Heart,
  MessageCircle,
  Share2,
  Trophy,
} from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

interface WorkoutFeedCardProps {
  workout: {
    _id: string;
    name: string;
    createdAt: number;
    exerciseCount: number;
    totalSets: number;
    totalVolume: number;
    user: {
      userId: string;
      name: string;
      username: string | null;
      image: string | null;
    };
  };
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
}

function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}k kg`;
  }
  return `${volume} kg`;
}

export function WorkoutFeedCard({ workout }: WorkoutFeedCardProps) {
  const initials = workout.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Pressable
      className={cn('mb-4 rounded-2xl border border-white/10 bg-black-2 p-4')}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Avatar className="h-10 w-10" alt={workout.user.name}>
            {workout.user.image && (
              <AvatarImage source={{ uri: workout.user.image }} />
            )}
            <AvatarFallback>
              <Text className="font-semibold text-white">{initials}</Text>
            </AvatarFallback>
          </Avatar>
          <View>
            <Text className="font-semibold text-white">
              {workout.user.name}
            </Text>
            <Text className="text-sm text-white/60">
              {workout.user.username ? `@${workout.user.username}` : 'User'}
            </Text>
          </View>
        </View>
        <Text className="text-sm text-white/60">
          {formatTimeAgo(workout.createdAt)}
        </Text>
      </View>

      <View className="mb-4 flex-row items-center gap-2">
        <Dumbbell size={20} className="text-green-1" />
        <Text className="font-bold text-lg text-white">{workout.name}</Text>
      </View>

      <View className="mb-4 flex-row flex-wrap gap-2">
        <View className="flex-row items-center gap-1.5 rounded-full bg-cyan-1/10 px-3 py-1">
          <Text className="font-medium text-cyan-1 text-sm">
            {workout.exerciseCount} exercises
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5 rounded-full bg-green-1/10 px-3 py-1">
          <Text className="font-medium text-green-1 text-sm">
            {workout.totalSets} sets
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5 rounded-full bg-orange-1/10 px-3 py-1">
          <Text className="font-medium text-orange-1 text-sm">
            {formatVolume(workout.totalVolume)}
          </Text>
        </View>
        {workout.totalVolume > 5000 && (
          <View className="flex-row items-center gap-1.5 rounded-full bg-orange-1/10 px-3 py-1">
            <Trophy size={14} className="text-orange-1" />
            <Text className="font-medium text-orange-1 text-sm">PR</Text>
          </View>
        )}
      </View>

      <Separator className="mb-3 bg-white/10" />

      <View className="flex-row items-center justify-between px-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-row items-center gap-2"
        >
          <Heart size={20} className="text-white/60" />
          <Text className="text-white/60">Like</Text>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-row items-center gap-2"
        >
          <MessageCircle size={20} className="text-white/60" />
          <Text className="text-white/60">Comment</Text>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-row items-center gap-2"
        >
          <Share2 size={20} className="text-white/60" />
          <Text className="text-white/60">Share</Text>
        </Button>
      </View>
    </Pressable>
  );
}
