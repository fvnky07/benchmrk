import { Button, ListItem, Text } from '@expo/ui';
import { router } from 'expo-router';

import { NativeScreen } from '@/components/native/native-screen';

export default function WelcomeScreen() {
  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 32, fontWeight: '700' }}>Welcome</Text>
      <Text textStyle={{ fontSize: 17 }}>
        Track training, build consistency, and review your progress.
      </Text>
      <ListItem supportingText="Apple sign-in is not configured for this app yet.">
        Continue with Apple
      </ListItem>
      <ListItem supportingText="Google sign-in is not configured for this app yet.">
        Continue with Google
      </ListItem>
      <Button
        label="Create account"
        onPress={() => router.replace('/register')}
      />
      <Button
        label="Log in"
        variant="outlined"
        onPress={() => router.replace('/login')}
      />
    </NativeScreen>
  );
}
