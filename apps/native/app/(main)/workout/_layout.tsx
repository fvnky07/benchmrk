import { Stack } from 'expo-router';

export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#151515' },
        headerTitleStyle: {
          color: '#fff',
          fontWeight: '700',
          fontSize: 22,
        },
        headerTintColor: '#00ff90',
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="create-workout" options={{ title: 'Create Workout' }} />
    </Stack>
  );
}
