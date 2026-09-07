import { Stack } from 'expo-router';

import { useAppearance } from '@/lib/ui';

export default function SettingsLayout() {
  const { navigationTheme } = useAppearance();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: navigationTheme.colors.card },
        headerTintColor: navigationTheme.colors.primary,
        headerTitleStyle: {
          color: navigationTheme.colors.text,
          fontWeight: '700',
          fontSize: 22,
        },

        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen
        name="manage-account"
        options={{ title: 'Manage Account' }}
      />
      <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
      <Stack.Screen
        name="workout-settings"
        options={{ title: 'Workout Settings' }}
      />
      <Stack.Screen name="integrations" options={{ title: 'Integrations' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen
        name="export-import"
        options={{ title: 'Export & Import' }}
      />
    </Stack>
  );
}
