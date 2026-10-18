import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';

export default function ExportImportScreen() {
  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('export_import');
    }, [])
  );

  return (
    <NativeScreen>
      <Card divided>
        <CardRow supportingText="Exporting workout history, settings, and profile data is not available yet.">
          Export data
        </CardRow>
        <CardRow supportingText="Importing a previous export is not available yet.">
          Import data
        </CardRow>
      </Card>
    </NativeScreen>
  );
}
