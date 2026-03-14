import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';

export default function ConfigureWorkoutScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black-1" edges={['bottom']}>
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-white">Coming soon...</Text>
      </View>
    </SafeAreaView>
  );
}
