import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { WorkoutCard } from '@/components/workout';
import { type WorkoutSummary, workoutsApi } from '@/lib';

export default function WorkoutScreen() {
  const workouts = useQuery(workoutsApi.listWorkouts);

  if (workouts === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1">
        <ActivityIndicator size="large" color="#00ff90" />
        <Text className="mt-4 text-white/60">Loading workouts…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black-1" edges={['top']}>
      <ScrollView className="flex-1 px-4 py-4">
        <View className="mb-6 gap-3">
          <Text className="font-semibold text-3xl text-white">Workouts</Text>
          <Text className="text-white/60">
            Build, save, and start your own workout routines.
          </Text>
          <Button
            className="bg-green-1"
            onPress={() => router.push('/workout/create')}
          >
            <Text>Create workout</Text>
          </Button>
        </View>

        {workouts.length === 0 ? (
          <View className="rounded-2xl border border-white/15 border-dashed bg-black-3 px-4 py-6">
            <Text className="font-semibold text-lg text-white">
              No workouts saved yet
            </Text>
            <Text className="mt-2 text-white/60">
              Create your first routine to start training from this tab.
            </Text>
          </View>
        ) : (
          workouts.map((workout: WorkoutSummary) => (
            <WorkoutCard
              key={workout._id}
              title={workout.name}
              subtitle="Saved routine"
              onPress={() =>
                router.push(`/(main)/workout/${workout._id}/start`)
              }
              onStart={() =>
                router.push(`/(main)/workout/${workout._id}/start`)
              }
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
