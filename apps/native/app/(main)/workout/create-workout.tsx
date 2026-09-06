import { Text } from '@expo/ui';

import { NativeScreen } from '@/components/native/native-screen';

export default function CreateWorkoutScreen() {
  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        Create workout
      </Text>
    </NativeScreen>
  );
}
