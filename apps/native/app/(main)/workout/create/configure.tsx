import { useQuery } from 'convex/react';
import { router, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  type ExerciseSummary,
  exerciseConfigSchema,
  exercisesApi,
  useWorkoutStore,
} from '@/lib';

export default function ConfigureWorkoutScreen() {
  const navigation = useNavigation();
  const selectedExerciseIds = useWorkoutStore(
    (state) => state.selectedExerciseIds
  );
  const exerciseConfigs = useWorkoutStore((state) => state.exerciseConfigs);
  const setExerciseConfig = useWorkoutStore((state) => state.setExerciseConfig);
  const exercises = useQuery(exercisesApi.listExercises);

  const selectedExercises = (exercises ?? []).filter(
    (exercise: ExerciseSummary) => selectedExerciseIds.includes(exercise._id)
  );

  const canReview =
    selectedExercises.length > 0 &&
    selectedExercises.every((exercise: ExerciseSummary) => {
      const config = exerciseConfigs[exercise._id] ?? {
        sets: 3,
        reps: 10,
        weight: 0,
      };

      return exerciseConfigSchema.safeParse(config).success;
    });

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          size="sm"
          className="bg-green-1"
          disabled={!canReview}
          onPress={() => router.push('/workout/create/review')}
        >
          <Text>Review</Text>
        </Button>
      ),
    });
  }, [canReview, navigation]);

  const handleNumberChange = (
    exerciseId: string,
    field: 'sets' | 'reps' | 'weight',
    value: string
  ) => {
    const previous = exerciseConfigs[exerciseId] ?? {
      sets: 3,
      reps: 10,
      weight: 0,
    };

    const numericValue = Number(value || 0);

    setExerciseConfig(exerciseId, {
      ...previous,
      [field]: Number.isNaN(numericValue) ? 0 : numericValue,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-black-1" edges={['bottom']}>
      <ScrollView className="flex-1 px-4 py-4">
        <View className="mb-5 gap-2">
          <Text className="font-semibold text-2xl text-white">
            Configure your exercises
          </Text>
          <Text className="text-white/60">
            Tune the sets, reps, and weight for each selected movement.
          </Text>
        </View>

        {selectedExercises.map((exercise: ExerciseSummary) => {
          const config = exerciseConfigs[exercise._id] ?? {
            sets: 3,
            reps: 10,
            weight: 0,
          };

          return (
            <View
              key={exercise._id}
              className="mb-4 rounded-2xl border border-white/10 bg-black-3 px-4 py-4"
            >
              <Text className="font-semibold text-lg text-white">
                {exercise.name}
              </Text>
              <Text className="mt-1 text-sm text-white/60">
                {exercise.description}
              </Text>

              <View className="mt-4 flex-row gap-3">
                <View className="flex-1 gap-1">
                  <Text className="text-sm text-white/60">Sets</Text>
                  <Input
                    keyboardType="numeric"
                    value={String(config.sets)}
                    onChangeText={(value) =>
                      handleNumberChange(exercise._id, 'sets', value)
                    }
                    className="border-white/10 bg-black-2 text-white"
                  />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-sm text-white/60">Reps</Text>
                  <Input
                    keyboardType="numeric"
                    value={String(config.reps)}
                    onChangeText={(value) =>
                      handleNumberChange(exercise._id, 'reps', value)
                    }
                    className="border-white/10 bg-black-2 text-white"
                  />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-sm text-white/60">Weight</Text>
                  <Input
                    keyboardType="numeric"
                    value={String(config.weight)}
                    onChangeText={(value) =>
                      handleNumberChange(exercise._id, 'weight', value)
                    }
                    className="border-white/10 bg-black-2 text-white"
                  />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
