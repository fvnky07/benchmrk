import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { ActiveExerciseCard } from '@/components/workout/ActiveExerciseCard';
import { ExercisePicker } from '@/components/workout/ExercisePicker';
import type { SetMetrics } from '@/components/workout/SetRow';
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
  const navigation = useNavigation();

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
    workoutId ? { workoutId } : 'skip'
  );
  const workoutExercises = useQuery(
    workoutExercisesApi.getWorkoutExercises,
    workoutId ? { workoutId } : 'skip'
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
    if (hasInitialized.current) return;
    if (!workoutId) return;
    if (workout === undefined || workoutExercises === undefined) return;
    if (!workout) return;

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
    async (setId: string, metrics: SetMetrics) => {
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-2xl text-green-1">⌄</Text>
        </Pressable>
      ),
      headerTitle: () => (
        <Text className="font-mono text-lg text-white">{formatted}</Text>
      ),
      headerRight: () => (
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => setPickerOpen(true)} hitSlop={8}>
            <Text className="font-semibold text-2xl text-green-1">+</Text>
          </Pressable>
          <Pressable onPress={handleComplete} hitSlop={8}>
            <Text className="font-semibold text-base text-green-1">Done</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, formatted, handleComplete, router]);

  if (workout === undefined || workoutExercises === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1">
        <ActivityIndicator size="large" color="#00ff90" />
        <Text className="mt-4 text-white/60">Loading workout…</Text>
      </View>
    );
  }

  if (!workoutId) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1 px-6">
        <Text className="font-semibold text-lg text-white">
          Invalid workout
        </Text>
        <Text className="mt-2 text-center text-white/60">
          This workout link is invalid.
        </Text>
      </View>
    );
  }

  if (!workout) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1 px-6">
        <Text className="font-semibold text-lg text-white">
          Workout not found
        </Text>
        <Text className="mt-2 text-center text-white/60">
          This saved workout could not be loaded.
        </Text>
      </View>
    );
  }

  if (!activeSessionId || sessionExercises === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1">
        <ActivityIndicator size="large" color="#00ff90" />
        <Text className="mt-4 text-white/60">Starting session…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black-1" edges={['bottom']}>
      <ScrollView className="flex-1 px-4 py-4">
        {sessionExercises.length === 0 ? (
          <View className="mt-8 rounded-2xl border border-dashed border-white/15 bg-black-3 px-4 py-8">
            <Text className="text-center font-semibold text-lg text-white">
              No exercises yet
            </Text>
            <Text className="mt-2 text-center text-white/60">
              Tap + to add your first exercise
            </Text>
          </View>
        ) : (
          <View className="pb-6">
            {sessionExercises.map((exercise) => (
              <ActiveExerciseCard
                key={exercise._id}
                sessionExercise={exercise}
                sets={(sessionSets ?? []).filter(
                  (s) => s.sessionExerciseId === exercise._id
                )}
                weightUnit="kg"
                onAddSet={() => handleAddSet(exercise._id)}
                onLogSet={(setId, metrics) => handleLogSet(setId, metrics)}
                onDeleteSet={(setId) => handleDeleteSet(setId)}
                onRemoveExercise={() => handleRemoveExercise(exercise._id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <ExercisePicker
        sessionId={activeSessionId}
        isOpen={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        onExerciseAdded={handleExerciseAdded}
      />
    </SafeAreaView>
  );
}
