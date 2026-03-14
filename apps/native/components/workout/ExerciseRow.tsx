import { Pressable, View } from 'react-native';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type ExerciseRowProps = {
  title: string;
  description: string;
  imageUrl?: string;
  selected?: boolean;
  onPress: () => void;
  onView: () => void;
};

export function ExerciseRow({
  title,
  description,
  imageUrl,
  selected = false,
  onPress,
  onView,
}: ExerciseRowProps) {
  return (
    <Pressable
      className={`mb-3 rounded-2xl border px-4 py-4 ${
        selected ? 'border-green-1 bg-black-2' : 'border-white/10 bg-black-3'
      }`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <View className="flex-row gap-3">
        <Avatar className="size-16 rounded-2xl" alt={title}>
          {imageUrl ? <AvatarImage source={{ uri: imageUrl }} /> : null}
          <AvatarFallback className="rounded-2xl bg-green-1/20">
            <Text className="font-semibold text-green-1 text-lg">
              {title.slice(0, 1)}
            </Text>
          </AvatarFallback>
        </Avatar>

        <View className="flex-1 gap-2">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="font-semibold text-base text-white">
                {title}
              </Text>
              <Text className="mt-1 text-sm text-white/60">{description}</Text>
            </View>

            {selected ? (
              <View className="rounded-full bg-green-1 px-2 py-1">
                <Text className="text-black text-xs">Selected</Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onPress={onView}
            >
              <Text>View exercise</Text>
            </Button>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
