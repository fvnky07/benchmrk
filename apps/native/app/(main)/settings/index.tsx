import { Button, Column, Row, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { useUserProfile } from '@/lib';
import { analytics } from '@/lib/analytics';
import { font, space, textColor, useColors } from '@/lib/ui';

export default function SettingsScreen() {
  const colors = useColors();
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

  const caption = { ...font.body, color: textColor(colors.onSurfaceVariant) };

  if (settings === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={caption}>Loading settings…</Text>
      </NativeScreen>
    );
  }

  if (settings === null) {
    return (
      <NativeScreen>
        <Text textStyle={caption}>Sign in to access your settings.</Text>
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
      <Card divided>
        <CardRow
          chevron
          supportingText={username}
          onPress={() => router.push('/(main)/settings/manage-account')}
        >
          Manage account
        </CardRow>
      </Card>
      <Card divided>
        <CardRow
          chevron
          supportingText={appearanceLabel}
          onPress={() => router.push('/(main)/settings/appearance')}
        >
          Appearance
        </CardRow>
        <CardRow
          chevron
          supportingText={workoutSummary}
          onPress={() => router.push('/(main)/settings/workout-settings')}
        >
          Workout settings
        </CardRow>
        <CardRow
          chevron
          supportingText="Unavailable until notification delivery is configured."
          onPress={() => router.push('/(main)/settings/notifications')}
        >
          Notifications
        </CardRow>
        <CardRow
          chevron
          supportingText={
            settings.analyticsOptOut ? 'Analytics off' : 'Analytics on'
          }
          onPress={() => router.push('/(main)/settings/privacy')}
        >
          Privacy
        </CardRow>
      </Card>
      <Card divided>
        <CardRow
          chevron
          supportingText="Unavailable until integration providers are configured."
          onPress={() => router.push('/(main)/settings/integrations')}
        >
          Integrations
        </CardRow>
        <CardRow
          chevron
          supportingText="Unavailable until data export and import are configured."
          onPress={() => router.push('/(main)/settings/export-import')}
        >
          Export & import data
        </CardRow>
      </Card>
      {errorMessage ? (
        <Card>
          <CardRow supportingText={errorMessage}>Could not reset</CardRow>
        </Card>
      ) : null}
      {isConfirmingReset ? (
        <Card tone="high" padding={space.lg} spacing={space.md}>
          <Column spacing={2}>
            <Text
              textStyle={{
                ...font.bodyStrong,
                color: textColor(colors.onSurface),
              }}
            >
              Confirm reset
            </Text>
            <Text
              textStyle={{
                ...font.caption,
                color: textColor(colors.onSurfaceVariant),
              }}
            >
              This restores every setting to its default.
            </Text>
          </Column>
          <Row spacing={space.sm}>
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
          </Row>
        </Card>
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
