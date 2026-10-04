import { Stack } from 'expo-router';

import { useAppearance } from '@/lib/ui';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function WorkoutLayout() {
  const { navigationTheme } = useAppearance();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: navigationTheme.colors.card },
        headerTitleStyle: {
          color: navigationTheme.colors.text,
          fontWeight: '700',
          fontSize: 22,
        },
        headerTintColor: navigationTheme.colors.primary,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="routine/[id]" options={{ title: 'Routine' }} />
      <Stack.Screen name="active" options={{ title: '' }} />
      <Stack.Screen name="group" options={{ title: 'Group' }} />
      <Stack.Screen
        name="finished/[id]"
        options={{ title: '', headerBackVisible: false, gestureEnabled: false }}
      />
      <Stack.Screen name="recap/[groupId]" options={{ title: 'Group recap' }} />
      <Stack.Screen
        name="exercise/[slug]"
        options={{
          title: 'Exercise Details',
        }}
      />
    </Stack>
  );
}
