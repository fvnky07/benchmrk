import { Text } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Href, useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';

export default function WorkoutScreen() {
  const router = useRouter();
  const handlePress = (path: Href) => () => {
    router.push(path);
  };
  return (
    <SafeAreaView className="flex-1 gap-2 bg-black-1 px-4 py-4" edges={['top']}>
      <Button
        className="bg-green-1"
        onPress={handlePress('/workout/create-workout')}
      >
        <Text>create workout</Text>
      </Button>
    </SafeAreaView>
  );
}
