import { ListItem, Text } from '@expo/ui';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';

export default function NotificationsScreen() {
  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('notifications');
    }, [])
  );

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        Notifications are unavailable
      </Text>
      <ListItem supportingText="Push notifications and notification preferences have not been configured yet.">
        Coming soon
      </ListItem>
    </NativeScreen>
  );
}
