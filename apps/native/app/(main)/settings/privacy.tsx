import { ListItem, Switch, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

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

  const setShareAnalytics = async (share: boolean) => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      await updateSettings({ analyticsOptOut: !share });
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
        onValueChange={setShareAnalytics}
      />
      <ListItem supportingText="When this is off, Benchmrk records no usage analytics for you on any device you sign in to.">
        Usage analytics
      </ListItem>
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Could not save</ListItem>
      ) : null}
    </NativeScreen>
  );
}
