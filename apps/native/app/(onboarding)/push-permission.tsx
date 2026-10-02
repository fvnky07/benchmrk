import { Button, ListItem, Text } from '@expo/ui';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';

import { NativeScreen } from '@/components/native/native-screen';
import { useAuth } from '@/lib/auth/hooks';
import { completePushProfileSetup } from '@/lib/push/profile-setup-push-step';
import {
  PUSH_PERMISSION_EXPLANATION,
  PUSH_PERMISSION_TITLE,
  requestPushPermission,
} from '@/lib/push/use-push-permission-reoffer';

/** The skippable final Profile setup step, before any notification OS prompt. */
export default function PushPermissionScreen() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const continueSetup = async (allow: boolean) => {
    if (!user || busy) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      if (allow && Platform.OS !== 'web') await requestPushPermission();
      await completePushProfileSetup(user.id);
      router.replace('/(main)');
    } catch {
      setErrorMessage(
        'Couldn’t complete this step. Try again, or continue with Not now.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <NativeScreen>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <Text textStyle={{ fontSize: 30, fontWeight: '700' }}>
        {PUSH_PERMISSION_TITLE}
      </Text>
      <Text textStyle={{ fontSize: 17 }}>{PUSH_PERMISSION_EXPLANATION}</Text>
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Not completed</ListItem>
      ) : null}
      <Button
        disabled={busy || !user}
        label={busy ? 'Continuing…' : 'Allow'}
        onPress={() => void continueSetup(true)}
      />
      <Button
        disabled={busy || !user}
        label="Not now"
        variant="text"
        onPress={() => void continueSetup(false)}
      />
    </NativeScreen>
  );
}
