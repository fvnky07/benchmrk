import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

/** Native headers, centred, coloured by the navigation theme. */
export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackButtonDisplayMode: 'minimal',
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="active" options={{ headerShown: false }} />
      <Stack.Screen name="routine/[id]" options={{ title: 'Routine' }} />
      <Stack.Screen name="group" options={{ title: 'Group' }} />
      <Stack.Screen
        name="finished/[id]"
        options={{
          title: 'Workout complete',
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="recap/[groupId]" options={{ title: 'Group recap' }} />
      <Stack.Screen name="exercise/[slug]" options={{ title: 'Exercise' }} />
      <Stack.Screen name="history/index" options={{ title: 'History' }} />
      <Stack.Screen name="history/[id]" options={{ title: 'Workout' }} />
    </Stack>
  );
}
