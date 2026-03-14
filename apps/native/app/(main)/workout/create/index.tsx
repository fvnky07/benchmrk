import { useQuery } from 'convex/react';
import { router, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { ExerciseRow } from '@/components/workout';
import {
  type ExerciseSummary,
  exercisesApi,
  useWorkoutStore,
  workoutNameSchema,
} from '@/lib';

export default function CreateWorkoutScreen() {
  const navigation = useNavigation();
  const exercises = useQuery(exercisesApi.listExercises);
  const title = useWorkoutStore((state) => state.title);
  const selectedExerciseIds = useWorkoutStore(
    (state) => state.selectedExerciseIds
  );
  const setTitle = useWorkoutStore((state) => state.setTitle);
  const toggleExercise = useWorkoutStore((state) => state.toggleExercise);

  const canContinue =
    workoutNameSchema.safeParse(title).success &&
    selectedExerciseIds.length > 0;

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          size="sm"
          className="bg-green-1"
          disabled={!canContinue}
          onPress={() => router.push('/workout/create/configure')}
        >
          <Text>Continue</Text>
        </Button>
      ),
    });
  }, [canContinue, navigation]);

  if (exercises === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1">
        <ActivityIndicator size="large" color="#00ff90" />
        <Text className="mt-4 text-white/60">Loading exercises…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black-1" edges={['bottom']}>
      <ScrollView className="flex-1 px-4 py-4">
        <View className="mb-5 gap-2">
          <Text className="font-semibold text-2xl text-white">
            Name your workout
          </Text>
          <Text className="text-white/60">
            Choose a title and pick the exercises you want to include.
          </Text>
        </View>

        <Input
          value={title}
          onChangeText={setTitle}
          placeholder="Push Day A"
          className="mb-5 h-12 border-white/10 bg-black-3 text-white"
          placeholderTextColor="#777"
        />

        <View className="mb-3 flex-row items-center justify-between">
          <Text className="font-semibold text-lg text-white">Exercises</Text>
          <Text className="text-sm text-white/60">
            {selectedExerciseIds.length} selected
          </Text>
        </View>

        {exercises.length === 0 ? (
          <View className="rounded-2xl border border-white/15 border-dashed bg-black-3 px-4 py-6">
            <Text className="font-semibold text-lg text-white">
              No exercises available
            </Text>
            <Text className="mt-2 text-white/60">
              Seed the catalog before creating workouts.
            </Text>
          </View>
        ) : (
          exercises.map((exercise: ExerciseSummary) => (
            <ExerciseRow
              key={exercise._id}
              title={exercise.name}
              description={exercise.description}
              imageUrl={exercise.imageUrl}
              selected={selectedExerciseIds.includes(exercise._id)}
              onPress={() => toggleExercise(exercise._id)}
              onView={() =>
                router.push(`/(main)/workout/exercise/${exercise.slug}`)
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
