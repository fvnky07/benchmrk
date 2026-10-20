import { Column, Picker, Switch, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionArgs } from 'convex/server';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';
import {
  accessibilityModifier,
  font,
  space,
  textColor,
  useColors,
} from '@/lib/ui';

export default function PrivacySettingsScreen() {
  const colors = useColors();
  const settings = useQuery(api.memberSettings.get);
  const updateSettings = useMutation(api.memberSettings.update);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('privacy');
    }, [])
  );

  const saveSettings = async (
    changes: FunctionArgs<typeof api.memberSettings.update>
  ) => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      await updateSettings(changes);
    } catch {
      setErrorMessage('Could not save this setting. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) {
    return (
      <NativeScreen>
        <Text
          textStyle={{
            ...font.body,
            color: textColor(colors.onSurfaceVariant),
          }}
        >
          Loading privacy settings…
        </Text>
      </NativeScreen>
    );
  }

  return (
    <NativeScreen>
      <Card>
        <CardRow
          supportingText="When this is off, Benchmrk records no usage analytics for you on any device you sign in to."
          trailing={
            <Switch
              disabled={isSaving}
              modifiers={[accessibilityModifier('Share usage analytics')]}
              value={!settings.analyticsOptOut}
              onValueChange={(share) =>
                void saveSettings({ analyticsOptOut: !share })
              }
            />
          }
        >
          Share usage analytics
        </CardRow>
      </Card>
      <Card>
        <CardRow supportingText="Who can invite you to a Group by username.">
          Group invites
        </CardRow>
        <Column
          style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}
        >
          <Picker
            enabled={!isSaving}
            selectedValue={settings.invitesFrom}
            onValueChange={(value) => {
              if (
                value === 'everyone' ||
                value === 'groupmates' ||
                value === 'nobody'
              ) {
                void saveSettings({ invitesFrom: value });
              }
            }}
          >
            <Picker.Item label="Everyone" value="everyone" />
            <Picker.Item
              label="People you’ve been in a Group with"
              value="groupmates"
            />
            <Picker.Item label="Nobody" value="nobody" />
          </Picker>
        </Column>
      </Card>
      <Card>
        <CardRow
          chevron
          modifiers={[accessibilityModifier('Blocked members')]}
          onPress={() => router.push('/settings/blocked')}
        >
          Blocked members
        </CardRow>
      </Card>
      {errorMessage ? (
        <Card>
          <CardRow supportingText={errorMessage}>Could not save</CardRow>
        </Card>
      ) : null}
    </NativeScreen>
  );
}
