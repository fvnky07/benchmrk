import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackButtonDisplayMode: 'minimal',
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen
        name="manage-account"
        options={{ title: 'Manage Account' }}
      />
      <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
      <Stack.Screen
        name="two-factor"
        options={{ title: 'Two-Factor Authentication' }}
      />
      <Stack.Screen
        name="delete-account"
        options={{ title: 'Delete Account' }}
      />
      <Stack.Screen
        name="change-password"
        options={{ title: 'Change Password' }}
      />
      <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
      <Stack.Screen
        name="workout-settings"
        options={{ title: 'Workout Settings' }}
      />
      <Stack.Screen name="quick-actions" options={{ title: 'Quick Actions' }} />
      <Stack.Screen name="integrations" options={{ title: 'Integrations' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
      <Stack.Screen name="blocked" options={{ title: 'Blocked members' }} />
      <Stack.Screen
        name="export-import"
        options={{ title: 'Export & Import' }}
      />
    </Stack>
  );
}
