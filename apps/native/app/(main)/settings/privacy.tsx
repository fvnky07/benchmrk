import { Button, ListItem, Picker, Switch, Text } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionArgs } from 'convex/server';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';

export default function PrivacySettingsScreen() {
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
        <Text textStyle={{ fontSize: 17 }}>Loading privacy settings…</Text>
      </NativeScreen>
    );
  }

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>Privacy</Text>
      <Switch
        disabled={isSaving}
        label="Share usage analytics"
        value={!settings.analyticsOptOut}
        onValueChange={(share) =>
          void saveSettings({ analyticsOptOut: !share })
        }
      />
      <ListItem supportingText="When this is off, Benchmrk records no usage analytics for you on any device you sign in to.">
        Usage analytics
      </ListItem>
      <ListItem supportingText="Who can invite you to a Group by username.">
        Group invites
      </ListItem>
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
      <Button
        label="Blocked members"
        modifiers={[
          Platform.OS === 'ios'
            ? accessibilityLabel('Blocked members')
            : semantics({ contentDescription: 'Blocked members' }),
        ]}
        onPress={() => router.push('/settings/blocked')}
        variant="outlined"
      />
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Could not save</ListItem>
      ) : null}
    </NativeScreen>
  );
}
