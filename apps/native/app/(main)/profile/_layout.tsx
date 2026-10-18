import { Stack } from 'expo-router';

import { useUserProfile } from '@/lib/hooks/use-user-profile';

export default function ProfileLayout() {
  const { username } = useUserProfile();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackButtonDisplayMode: 'minimal',
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="index" options={{ title: String(username) }} />
    </Stack>
  );
}
