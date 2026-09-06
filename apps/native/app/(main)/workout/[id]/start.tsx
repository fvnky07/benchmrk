import { Button, ListItem, Text } from '@expo/ui';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { NativeActiveExerciseCard } from '@/components/native/native-active-exercise-card';
import { NativeScreen } from '@/components/native/native-screen';
import type { NativeSetMetrics } from '@/components/native/native-set-row';
import { ExercisePicker } from '@/components/workout/ExercisePicker';
import {
  sessionExercisesApi,
  sessionSetsApi,
  showToast,
  useActiveSessionStore,
  useWorkoutTimer,
  workoutExercisesApi,
  workoutSessionsApi,
  workoutsApi,
} from '@/lib';

export default function StartWorkoutScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const workoutId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const activeSessionId = useActiveSessionStore((s) => s.activeSessionId);
  const sessionStartTimestamp = useActiveSessionStore(
    (s) => s.sessionStartTimestamp
  );
  const startSessionStore = useActiveSessionStore((s) => s.startSession);
  const endSessionStore = useActiveSessionStore((s) => s.endSession);

  const [isPickerOpen, setPickerOpen] = useState(false);
  const hasInitialized = useRef(false);

  const { formatted } = useWorkoutTimer(sessionStartTimestamp);

  const workout = useQuery(
    workoutsApi.getWorkout,
    activeSessionId || !workoutId ? 'skip' : { workoutId }
  );
  const workoutExercises = useQuery(
    workoutExercisesApi.getWorkoutExercises,
    activeSessionId || !workoutId ? 'skip' : { workoutId }
  );

  const activeSession = useQuery(
    workoutSessionsApi.getSession,
    activeSessionId ? { sessionId: activeSessionId } : 'skip'
  );

  const sessionExercises = useQuery(
    sessionExercisesApi.getSessionExercises,
    activeSessionId ? { sessionId: activeSessionId } : 'skip'
  );
  const sessionSets = useQuery(
    sessionSetsApi.getSetsForSession,
    activeSessionId ? { sessionId: activeSessionId } : 'skip'
  );

  const startSessionMutation = useMutation(workoutSessionsApi.startSession);
  const addExerciseMutation = useMutation(
    sessionExercisesApi.addExerciseToSession
  );
  const completeSessionMutation = useMutation(
    workoutSessionsApi.completeSession
  );
  const addSetMutation = useMutation(sessionSetsApi.addSet);
  const logSetMutation = useMutation(sessionSetsApi.logSet);
  const deleteSetMutation = useMutation(sessionSetsApi.deleteSet);
  const removeExerciseMutation = useMutation(
    sessionExercisesApi.removeExerciseFromSession
  );

  // Session init: reconcile Zustand (local) ↔ Convex (server) state.
  // 5 paths: resume match, block conflict, clear stale, create new, wait.
  useEffect(() => {
    if (hasInitialized.current || !workoutId) return;

    if (activeSessionId) {
      if (activeSession === undefined) return;

      if (activeSession?.workoutTemplateId === workoutId) {
        hasInitialized.current = true;
        return;
      }

      if (activeSession) {
        hasInitialized.current = true;
        Alert.alert(
          'Active Workout in Progress',
          'Finish or discard your current workout before starting a new one.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      // Stale Zustand — Convex returned null
      endSessionStore();
      router.replace('/(main)/workout');
      return;
    }

    if (workout === undefined || workoutExercises === undefined) return;
    if (!workout) {
      hasInitialized.current = true;
      router.replace('/(main)/workout');
      return;
    }

    hasInitialized.current = true;

    (async () => {
      try {
        const sessionId = await startSessionMutation({
          name: workout.name,
          workoutTemplateId: workoutId,
        });

        if (!sessionId) {
          throw new Error('Session was not created');
        }

        startSessionStore(sessionId, workout.name, Date.now(), workoutId);

        for (const we of workoutExercises) {
          await addExerciseMutation({
            sessionId,
            exerciseId: we.exerciseId,
          });
        }

        showToast.success('Workout Started', workout.name);
      } catch (error) {
        console.error('Failed to start workout session:', error);
        showToast.error('Could not start workout', 'Please try again.');
        endSessionStore();
        router.replace('/(main)/workout');
      }
    })();
  }, [
    workout,
    workoutExercises,
    activeSessionId,
    activeSession,
    workoutId,
    router,
    startSessionMutation,
    addExerciseMutation,
    startSessionStore,
    endSessionStore,
  ]);

  const handleComplete = useCallback(() => {
    if (!activeSessionId) return;
    Alert.alert('Finish Workout?', 'Save this workout session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        style: 'default',
        onPress: async () => {
          await completeSessionMutation({
            sessionId: activeSessionId,
          });
          endSessionStore();
          showToast.success('Workout Complete', 'Great job!');
          router.replace('/(main)/workout');
        },
      },
    ]);
  }, [activeSessionId, completeSessionMutation, endSessionStore, router]);

  const handleAddSet = useCallback(
    async (sessionExerciseId: string) => {
      if (!activeSessionId) return;
      const existingSets = (sessionSets ?? []).filter(
        (s) => s.sessionExerciseId === sessionExerciseId
      );
      await addSetMutation({
        sessionExerciseId,
        sessionId: activeSessionId,
        setNumber: existingSets.length + 1,
      });
    },
    [activeSessionId, sessionSets, addSetMutation]
  );

  const handleLogSet = useCallback(
    async (setId: string, metrics: NativeSetMetrics) => {
      await logSetMutation({ setId, ...metrics });
    },
    [logSetMutation]
  );

  const handleDeleteSet = useCallback(
    async (setId: string) => {
      await deleteSetMutation({ setId });
    },
    [deleteSetMutation]
  );

  const handleRemoveExercise = useCallback(
    async (sessionExerciseId: string) => {
      await removeExerciseMutation({ sessionExerciseId });
    },
    [removeExerciseMutation]
  );

  const handleExerciseAdded = useCallback(() => {
    setPickerOpen(false);
  }, []);

  if (!workoutId) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
          Invalid workout
        </Text>
        <Text textStyle={{ fontSize: 17 }}>This workout link is invalid.</Text>
      </NativeScreen>
    );
  }

  if (activeSessionId) {
    if (activeSession === undefined || sessionExercises === undefined) {
      return (
        <NativeScreen>
          <Text textStyle={{ fontSize: 17 }}>Starting session…</Text>
        </NativeScreen>
      );
    }
  } else {
    if (workout === undefined || workoutExercises === undefined) {
      return (
        <NativeScreen>
          <Text textStyle={{ fontSize: 17 }}>Loading workout…</Text>
        </NativeScreen>
      );
    }

    if (!workout) {
      return (
        <NativeScreen>
          <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
            Workout not found
          </Text>
          <Text textStyle={{ fontSize: 17 }}>
            This saved workout could not be loaded.
          </Text>
        </NativeScreen>
      );
    }
  }

  if (!activeSessionId || sessionExercises === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>Starting session…</Text>
      </NativeScreen>
    );
  }

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>{formatted}</Text>
      <Button label="Add exercise" onPress={() => setPickerOpen(true)} />
      <Button
        label="Finish workout"
        variant="outlined"
        onPress={handleComplete}
      />
      {sessionExercises.length === 0 ? (
        <ListItem supportingText="Add an exercise to start tracking your workout.">
          No exercises yet
        </ListItem>
      ) : (
        sessionExercises.map((exercise) => (
          <NativeActiveExerciseCard
            key={exercise._id}
            sessionExercise={exercise}
            sets={(sessionSets ?? []).filter(
              (set) => set.sessionExerciseId === exercise._id
            )}
            weightUnit="kg"
            onAddSet={() => handleAddSet(exercise._id)}
            onLogSet={handleLogSet}
            onDeleteSet={handleDeleteSet}
            onRemoveExercise={() => handleRemoveExercise(exercise._id)}
          />
        ))
      )}
      <ExercisePicker
        sessionId={activeSessionId}
        isOpen={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        onExerciseAdded={handleExerciseAdded}
      />
    </NativeScreen>
  );
}
