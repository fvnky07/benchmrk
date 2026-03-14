import { useQuery } from 'convex/react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { workoutExercisesApi, workoutsApi } from '@/lib';

export default function StartWorkoutScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const workout = useQuery(
    workoutsApi.getWorkout,
    params.id ? { workoutId: params.id } : 'skip'
  );
  const workoutExercises = useQuery(
    workoutExercisesApi.getWorkoutExercises,
    params.id ? { workoutId: params.id } : 'skip'
  );

  if (workout === undefined || workoutExercises === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1">
        <ActivityIndicator size="large" color="#00ff90" />
        <Text className="mt-4 text-white/60">Loading workout…</Text>
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

  return (
    <SafeAreaView className="flex-1 bg-black-1" edges={['bottom']}>
      <ScrollView className="flex-1 px-4 py-4">
        <View className="mb-5 gap-2">
          <Text className="font-semibold text-2xl text-white">
            {workout.name}
          </Text>
          <Text className="text-white/60">
            Start your saved workout using the exercise order and targets below.
          </Text>
        </View>

        <View className="gap-3 pb-6">
          {workoutExercises.map((workoutExercise) => (
            <View
              key={workoutExercise._id}
              className="rounded-2xl border border-white/10 bg-black-3 px-4 py-4"
            >
              <Text className="font-semibold text-lg text-white">
                {workoutExercise.exercise.name}
              </Text>
              <Text className="mt-1 text-white/60">
                {workoutExercise.exercise.description}
              </Text>
              <Text className="mt-3 text-green-1 text-sm">
                {workoutExercise.sets} sets • {workoutExercise.reps} reps •{' '}
                {workoutExercise.weight} weight
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
