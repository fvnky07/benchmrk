import { ListItem, Switch, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionArgs } from 'convex/server';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';

export default function NotificationsScreen() {
  const settings = useQuery(api.memberSettings.get);
  const updateSettings = useMutation(api.memberSettings.update);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('notifications');
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
        <Text textStyle={{ fontSize: 17 }}>Loading notification settings…</Text>
      </NativeScreen>
    );
  }

  const typesDisabled = isSaving || !settings.pushNotifications;

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>Notifications</Text>
      <Switch
        disabled={isSaving}
        label="Push notifications"
        value={settings.pushNotifications}
        onValueChange={(pushNotifications) =>
          void saveSettings({ pushNotifications })
        }
      />
      <Switch
        disabled={typesDisabled}
        label="Group invites"
        value={settings.pushInvites}
        onValueChange={(pushInvites) => void saveSettings({ pushInvites })}
      />
      <Switch
        disabled={typesDisabled}
        label="Someone joins your Group"
        value={settings.pushJoins}
        onValueChange={(pushJoins) => void saveSettings({ pushJoins })}
      />
      <Switch
        disabled={typesDisabled}
        label="Someone leaves your Group"
        value={settings.pushLeaves}
        onValueChange={(pushLeaves) => void saveSettings({ pushLeaves })}
      />
      <Switch
        disabled={typesDisabled}
        label="Your Group ends"
        value={settings.pushGroupEnded}
        onValueChange={(pushGroupEnded) =>
          void saveSettings({ pushGroupEnded })
        }
      />
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Could not save</ListItem>
      ) : null}
    </NativeScreen>
  );
}
