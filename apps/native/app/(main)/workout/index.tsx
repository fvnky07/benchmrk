import { Button, ListItem, Text } from '@expo/ui';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';

import { NativeListScreen } from '@/components/native/native-list-screen';
import { type WorkoutSummary, workoutsApi } from '@/lib';

export default function WorkoutScreen() {
  const workouts = useQuery(workoutsApi.listWorkouts);

  return (
    <NativeListScreen>
      <ListItem supportingText="Build, save, and start your own workout routines.">
        Workouts
      </ListItem>
      <Button
        label="Create workout"
        onPress={() => router.push('/workout/create')}
      />
      {workouts === undefined ? (
        <ListItem supportingText="Loading your saved routines…">
          Workouts
        </ListItem>
      ) : workouts.length === 0 ? (
        <ListItem supportingText="Create your first routine to start training from this tab.">
          No workouts saved yet
        </ListItem>
      ) : (
        workouts.map((workout: WorkoutSummary) => (
          <ListItem
            key={workout._id}
            supportingText="Saved routine"
            onPress={() => router.push(`/(main)/workout/${workout._id}/start`)}
          >
            {workout.name}
          </ListItem>
        ))
      )}
      <Text textStyle={{ fontSize: 14 }}>
        Select a routine to start an active workout.
      </Text>
    </NativeListScreen>
  );
}
