import { Button, ListItem, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { useUserProfile } from '@/lib';
import { analytics } from '@/lib/analytics';

export default function SettingsScreen() {
  const settings = useQuery(api.memberSettings.get);
  const resetSettings = useMutation(api.memberSettings.reset);
  const [isResetting, setIsResetting] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { username } = useUserProfile();

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('settings_main');
    }, [])
  );

  const handleReset = async () => {
    try {
      setIsResetting(true);
      setErrorMessage(null);
      await resetSettings();
      analytics.preferencesReset();
      setIsConfirmingReset(false);
    } catch {
      setErrorMessage('Could not reset settings. Try again.');
    } finally {
      setIsResetting(false);
    }
  };

  if (settings === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>Loading settings…</Text>
      </NativeScreen>
    );
  }

  if (settings === null) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>
          Sign in to access your settings.
        </Text>
      </NativeScreen>
    );
  }

  const appearanceLabel =
    settings.appearance === 'system'
      ? 'System'
      : settings.appearance === 'light'
        ? 'Light'
        : 'Dark';
  const workoutSummary = `Rest ${settings.defaultRestSeconds}s · ${settings.units} · ${settings.effortScale}`;

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>Settings</Text>
      <ListItem
        supportingText={username}
        onPress={() => router.push('/(main)/settings/manage-account')}
      >
        Manage account
      </ListItem>
      <ListItem
        supportingText="Unavailable until data export and import are configured."
        onPress={() => router.push('/(main)/settings/export-import')}
      >
        Export & import data
      </ListItem>
      <ListItem
        supportingText="Unavailable until integration providers are configured."
        onPress={() => router.push('/(main)/settings/integrations')}
      >
        Integrations
      </ListItem>
      <ListItem
        supportingText={appearanceLabel}
        onPress={() => router.push('/(main)/settings/appearance')}
      >
        Appearance
      </ListItem>
      <ListItem
        supportingText={workoutSummary}
        onPress={() => router.push('/(main)/settings/workout-settings')}
      >
        Workout settings
      </ListItem>
      <ListItem
        supportingText="Unavailable until notification delivery is configured."
        onPress={() => router.push('/(main)/settings/notifications')}
      >
        Notifications
      </ListItem>
      <ListItem
        supportingText={
          settings.analyticsOptOut ? 'Analytics off' : 'Analytics on'
        }
        onPress={() => router.push('/(main)/settings/privacy')}
      >
        Privacy
      </ListItem>
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Could not reset</ListItem>
      ) : null}
      {isConfirmingReset ? (
        <>
          <ListItem supportingText="This restores every setting to its default.">
            Confirm reset
          </ListItem>
          <Button
            disabled={isResetting}
            label={isResetting ? 'Resetting…' : 'Reset settings'}
            onPress={handleReset}
          />
          <Button
            disabled={isResetting}
            label="Cancel"
            variant="outlined"
            onPress={() => setIsConfirmingReset(false)}
          />
        </>
      ) : (
        <Button
          label="Reset all settings"
          variant="outlined"
          onPress={() => setIsConfirmingReset(true)}
        />
      )}
    </NativeScreen>
  );
}
