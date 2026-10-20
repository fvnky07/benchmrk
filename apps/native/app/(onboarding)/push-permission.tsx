import { Button } from '@expo/ui';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';

import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { PrimaryButton } from '@/components/native/primary-button';
import { ScreenTitle } from '@/components/native/screen-title';
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
    <NativeScreen edges={['top', 'bottom']}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <ScreenTitle
        title={PUSH_PERMISSION_TITLE}
        subtitle={PUSH_PERMISSION_EXPLANATION}
      />
      {errorMessage ? (
        <Card>
          <CardRow supportingText={errorMessage}>Not completed</CardRow>
        </Card>
      ) : null}
      <PrimaryButton
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
