import { Button, ListItem, Text } from '@expo/ui';
import { router } from 'expo-router';

import { NativeScreen } from '@/components/native/native-screen';

export default function ForgotPasswordScreen() {
  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        Password recovery is unavailable
      </Text>
      <Text textStyle={{ fontSize: 17 }}>
        This version cannot send password-recovery emails yet. No recovery
        request has been sent.
      </Text>
      <ListItem supportingText="Password recovery will be available after the Better Auth recovery flow is configured.">
        Coming soon
      </ListItem>
      <Button label="Back to log in" onPress={() => router.replace('/login')} />
    </NativeScreen>
  );
}
