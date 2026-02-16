import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#1c1c1e' },
        headerTintColor: '#007AFF',
        headerTitleStyle: { color: 'white' },
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
      <Stack.Screen
        name="integrations"
        options={{ title: 'Integrations' }}
      />
      <Stack.Screen
        name="export-import"
        options={{ title: 'Export & Import' }}
      />
    </Stack>
  );
}
