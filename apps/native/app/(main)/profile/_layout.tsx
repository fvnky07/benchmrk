import { Stack } from 'expo-router';

import { useUserProfile } from '@/lib/hooks/use-user-profile';
import { useAppearance } from '@/lib/ui';

export default function ProfileLayout() {
  const { username } = useUserProfile();
  const { navigationTheme } = useAppearance();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: navigationTheme.colors.card },
        headerTintColor: navigationTheme.colors.primary,
        headerTitleStyle: {
          color: navigationTheme.colors.text,
          fontWeight: '700',
          fontSize: 22,
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: String(username) }} />
    </Stack>
  );
}
