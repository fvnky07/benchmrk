import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type WorkoutCardProps = {
  title: string;
  subtitle: string;
  onPress: () => void;
  onStart: () => void;
};

export function WorkoutCard({
  title,
  subtitle,
  onPress,
  onStart,
}: WorkoutCardProps) {
  return (
    <Pressable
      className="mb-3 rounded-2xl border border-white/10 bg-black-3 px-4 py-4"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View className="gap-4">
        <View className="gap-1">
          <Text className="font-semibold text-lg text-white">{title}</Text>
          <Text className="text-sm text-white/60">{subtitle}</Text>
        </View>

        <Button className="bg-green-1" onPress={onStart}>
          <Text>Start workout</Text>
        </Button>
      </View>
    </Pressable>
  );
}
