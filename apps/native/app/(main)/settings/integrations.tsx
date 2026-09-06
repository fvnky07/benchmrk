import { ListItem, Text } from '@expo/ui';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';

export default function IntegrationsScreen() {
  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('integrations');
    }, [])
  );

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        Integrations are unavailable
      </Text>
      <ListItem supportingText="Apple Health workout sync has not been configured.">
        Apple Health
      </ListItem>
      <ListItem supportingText="Strava activity export has not been configured.">
        Strava
      </ListItem>
    </NativeScreen>
  );
}
