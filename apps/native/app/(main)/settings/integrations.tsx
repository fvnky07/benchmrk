import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { Card, CardRow } from '@/components/native/card';
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
      <Card divided>
        <CardRow supportingText="Apple Health workout sync has not been configured.">
          Apple Health
        </CardRow>
        <CardRow supportingText="Strava activity export has not been configured.">
          Strava
        </CardRow>
      </Card>
    </NativeScreen>
  );
}
