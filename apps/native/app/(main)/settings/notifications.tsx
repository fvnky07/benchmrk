import { Switch, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionArgs } from 'convex/server';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';
import { accessibilityModifier, font, textColor, useColors } from '@/lib/ui';

type SettingsChanges = FunctionArgs<typeof api.memberSettings.update>;

export default function NotificationsScreen() {
  const colors = useColors();
  const settings = useQuery(api.memberSettings.get);
  const updateSettings = useMutation(api.memberSettings.update);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('notifications');
    }, [])
  );

  const saveSettings = async (changes: SettingsChanges) => {
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
          Loading notification settings…
        </Text>
      </NativeScreen>
    );
  }

  const typesDisabled = isSaving || !settings.pushNotifications;
  const rows: ReadonlyArray<{
    label: string;
    value: boolean;
    disabled: boolean;
    change: (value: boolean) => SettingsChanges;
  }> = [
    {
      label: 'Push notifications',
      value: settings.pushNotifications,
      disabled: isSaving,
      change: (pushNotifications) => ({ pushNotifications }),
    },
    {
      label: 'Group invites',
      value: settings.pushInvites,
      disabled: typesDisabled,
      change: (pushInvites) => ({ pushInvites }),
    },
    {
      label: 'Someone joins your Group',
      value: settings.pushJoins,
      disabled: typesDisabled,
      change: (pushJoins) => ({ pushJoins }),
    },
    {
      label: 'Someone leaves your Group',
      value: settings.pushLeaves,
      disabled: typesDisabled,
      change: (pushLeaves) => ({ pushLeaves }),
    },
    {
      label: 'Your Group ends',
      value: settings.pushGroupEnded,
      disabled: typesDisabled,
      change: (pushGroupEnded) => ({ pushGroupEnded }),
    },
  ];

  return (
    <NativeScreen>
      <Card divided>
        {rows.map((row) => (
          <CardRow
            key={row.label}
            trailing={
              <Switch
                disabled={row.disabled}
                modifiers={[accessibilityModifier(row.label)]}
                value={row.value}
                onValueChange={(value) => void saveSettings(row.change(value))}
              />
            }
          >
            {row.label}
          </CardRow>
        ))}
      </Card>
      {errorMessage ? (
        <Card>
          <CardRow supportingText={errorMessage}>Could not save</CardRow>
        </Card>
      ) : null}
    </NativeScreen>
  );
}
