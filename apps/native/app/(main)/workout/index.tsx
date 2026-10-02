import { Button, ListItem, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { formatClock } from '@/lib/workout/format';
import { useNow } from '@/lib/workout/use-now';
import { useStartWorkout } from '@/lib/workout/use-start-workout';

export default function WorkoutScreen() {
  const routines = useQuery(api.routines.list);
  const activeWorkout = useQuery(api.workouts.getActive);
  const startWorkout = useStartWorkout();
  const now = useNow();
  const createRoutine = useMutation(api.routines.create);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const create = async () => {
    try {
      setIsCreating(true);
      setErrorMessage(null);
      const routineId = await createRoutine({ name: newName });
      setNewName('');
      router.push(`/workout/routine/${routineId}`);
    } catch {
      setErrorMessage('Could not create this Routine. Try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 32, fontWeight: '700' }}>Workouts</Text>
      {activeWorkout ? (
        <ListItem
          onPress={() => router.push('/workout/active')}
          supportingText={`In progress · ${formatClock(
            (now - activeWorkout.startedAt) / 1000
          )} · ${activeWorkout.progress.done}/${activeWorkout.progress.total} Sets`}
        >
          {`Resume ${activeWorkout.name}`}
        </ListItem>
      ) : (
        <Button
          label="Start empty Workout"
          variant="outlined"
          onPress={() =>
            startWorkout().catch(() =>
              setErrorMessage('Could not start a Workout. Try again.')
            )
          }
        />
      )}
      <ListItem
        onPress={() => router.push('/workout/group')}
        supportingText="Train together: create a Group or join with a code"
      >
        Group
      </ListItem>
      <Text textStyle={{ fontSize: 20, fontWeight: '600' }}>Routines</Text>
      {routines === undefined ? (
        <Text textStyle={{ fontSize: 17 }}>Loading Routines…</Text>
      ) : routines.length === 0 ? (
        <ListItem supportingText="Build a Routine to plan your Exercises, Sets and Rep ranges.">
          No Routines yet
        </ListItem>
      ) : (
        routines.map((routine) => (
          <ListItem
            key={routine._id}
            onPress={() => router.push(`/workout/routine/${routine._id}`)}
            supportingText={`${routine.exerciseCount} ${
              routine.exerciseCount === 1 ? 'Exercise' : 'Exercises'
            }`}
          >
            {routine.name}
          </ListItem>
        ))
      )}
      <NativeTextField
        label="New Routine"
        placeholder="For example, Upper A"
        value={newName}
        onChangeText={setNewName}
      />
      <Button
        disabled={isCreating || newName.trim().length === 0}
        label={isCreating ? 'Creating…' : 'Create Routine'}
        onPress={create}
      />
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Could not create</ListItem>
      ) : null}
    </NativeScreen>
  );
}
