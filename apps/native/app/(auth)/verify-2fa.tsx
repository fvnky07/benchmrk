import { Button, ListItem, Text } from '@expo/ui';
import { router } from 'expo-router';

import { NativeScreen } from '@/components/native/native-screen';

export default function VerifyTwoFactorScreen() {
  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        Two-factor verification is unavailable
      </Text>
      <Text textStyle={{ fontSize: 17 }}>
        This app does not have a configured two-factor authenticator flow yet.
        No verification code can be accepted or resent.
      </Text>
      <ListItem supportingText="When available, two-factor authentication will use an authenticator app and backup codes.">
        Coming soon
      </ListItem>
      <Button label="Back to log in" onPress={() => router.replace('/login')} />
    </NativeScreen>
  );
}
