import { View } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';

export default function CreateWorkoutScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black-1" edges={['bottom']}>
      <View className="flex-1 px-4 py-4">
        <Text className="font-semibold text-white text-xl">Create Workout</Text>
      </View>
    </SafeAreaView>
  );
}
