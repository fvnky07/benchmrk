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
      <Stack.Screen
        name="create-workout"
        options={{ title: 'Create Workout' }}
      />
      <Stack.Screen
        name="create/index"
        options={{
          title: 'Create Workout',
          headerRight: () => null,
        }}
      />
      <Stack.Screen
        name="create/configure"
        options={{
          title: 'Configure Exercises',
          headerRight: () => null,
        }}
      />
      <Stack.Screen
        name="create/review"
        options={{
          title: 'Review Workout',
        }}
      />
      <Stack.Screen
        name="exercise/[slug]"
        options={{
          title: 'Exercise Details',
        }}
      />
      <Stack.Screen
        name="[id]/start"
        options={{
          title: '',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
