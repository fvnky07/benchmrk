import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

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
