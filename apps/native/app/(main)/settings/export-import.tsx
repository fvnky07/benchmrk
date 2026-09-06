import { ListItem, Text } from '@expo/ui';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

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
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        Data transfer is unavailable
      </Text>
      <ListItem supportingText="Exporting workout history, settings, and profile data is not available yet.">
        Export data
      </ListItem>
      <ListItem supportingText="Importing a previous export is not available yet.">
        Import data
      </ListItem>
    </NativeScreen>
  );
}
