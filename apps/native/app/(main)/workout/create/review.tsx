import { useMutation, useQuery } from 'convex/react';
import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  type ExerciseSummary,
  exercisesApi,
  showToast,
  useWorkoutStore,
  workoutExercisesApi,
  workoutsApi,
} from '@/lib';

export default function ReviewWorkoutScreen() {
  const navigation = useNavigation();
  const [isSaving, setIsSaving] = useState(false);
  const exercises = useQuery(exercisesApi.listExercises);
  const createWorkout = useMutation(workoutsApi.createWorkout);
  const addExercisesToWorkout = useMutation(
    workoutExercisesApi.addExercisesToWorkout
  );
  const title = useWorkoutStore((state) => state.title);
  const selectedExerciseIds = useWorkoutStore(
    (state) => state.selectedExerciseIds
  );
  const exerciseConfigs = useWorkoutStore((state) => state.exerciseConfigs);
  const reset = useWorkoutStore((state) => state.reset);

  const selectedExercises = useMemo(
    () =>
      (exercises ?? []).filter((exercise: ExerciseSummary) =>
        selectedExerciseIds.includes(exercise._id)
      ),
    [exercises, selectedExerciseIds]
  );

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      const workoutId = await createWorkout({ name: title });
      await addExercisesToWorkout({
        workoutId,
        exercises: selectedExercises.map((exercise: ExerciseSummary) => {
          const config = exerciseConfigs[exercise._id] ?? {
            sets: 3,
            reps: 10,
            weight: 0,
          };

          return {
            exerciseId: exercise._id,
            sets: config.sets,
            reps: config.reps,
            weight: config.weight,
          };
        }),
      });
      showToast.success('Workout saved', 'Your routine is ready to start.');
      reset();
      router.replace('/workout');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed';
      if (message.includes('FREE_TIER_LIMIT')) {
        showToast.error(
          'Workout limit reached',
          'Free users can store up to 3 workouts.'
        );
      } else {
        showToast.error('Unable to save workout', message);
      }
    } finally {
      setIsSaving(false);
    }
  }, [
    addExercisesToWorkout,
    createWorkout,
    exerciseConfigs,
    reset,
    selectedExercises,
    title,
  ]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          size="sm"
          className="bg-green-1"
          disabled={isSaving || !title || selectedExercises.length === 0}
          onPress={handleSave}
        >
          <Text>{isSaving ? 'Saving…' : 'Save'}</Text>
        </Button>
      ),
    });
  }, [handleSave, isSaving, navigation, selectedExercises.length, title]);

  if (exercises === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1">
        <ActivityIndicator size="large" color="#00ff90" />
        <Text className="mt-4 text-white/60">Loading workout summary…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black-1" edges={['bottom']}>
      <ScrollView className="flex-1 px-4 py-4">
        <View className="mb-5 gap-2">
          <Text className="font-semibold text-2xl text-white">
            Review workout
          </Text>
          <Text className="text-white/60">
            Confirm your routine before saving it to the workouts tab.
          </Text>
        </View>

        <View className="mb-4 rounded-2xl border border-white/10 bg-black-3 px-4 py-4">
          <Text className="text-sm text-white/60">Workout name</Text>
          <Text className="mt-2 font-semibold text-white text-xl">{title}</Text>
        </View>

        <View className="gap-3 pb-6">
          {selectedExercises.map((exercise: ExerciseSummary) => {
            const config = exerciseConfigs[exercise._id] ?? {
              sets: 3,
              reps: 10,
              weight: 0,
            };

            return (
              <View
                key={exercise._id}
                className="rounded-2xl border border-white/10 bg-black-3 px-4 py-4"
              >
                <Text className="font-semibold text-lg text-white">
                  {exercise.name}
                </Text>
                <Text className="mt-1 text-white/60">
                  {exercise.description}
                </Text>
                <Text className="mt-3 text-green-1 text-sm">
                  {config.sets} sets • {config.reps} reps • {config.weight}{' '}
                  weight
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
