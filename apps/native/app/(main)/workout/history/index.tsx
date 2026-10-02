import { Button, ListItem, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { type ErrorBoundaryProps, router } from 'expo-router';
import { NativeScreen } from '@/components/native/native-screen';
import { accessibilityModifier } from '@/lib/ui/accessibility';
import { formatClock } from '@/lib/workout/format';

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
        Could not load history
      </Text>
      <Text textStyle={{ fontSize: 17 }}>Try again to load your Workouts.</Text>
      <Button
        label="Try again"
        modifiers={[accessibilityModifier('Try loading Workout history again')]}
        onPress={() => void retry()}
      />
    </NativeScreen>
  );
}

export default function WorkoutHistoryScreen() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.history.list,
    {},
    { initialNumItems: 20 }
  );

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 32, fontWeight: '700' }}>History</Text>
      {status === 'LoadingFirstPage' ? (
        <Text textStyle={{ fontSize: 17 }}>Loading Workouts…</Text>
      ) : results.length === 0 ? (
        <ListItem supportingText="Completed Workouts appear here, including Workouts ended early with logged Sets.">
          No completed Workouts yet
        </ListItem>
      ) : (
        results.map((workout) => {
          const date = new Date(workout.finishedAt).toLocaleDateString(
            undefined,
            {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }
          );
          const summary = `${date} · ${formatClock(workout.durationSeconds)} · ${workout.setsDone} ${workout.setsDone === 1 ? 'Set' : 'Sets'} done`;
          const label = `View ${workout.name}, ${summary}`;
          return (
            <ListItem
              key={workout.workoutId}
              modifiers={[accessibilityModifier(label)]}
              supportingText={summary}
              onPress={() =>
                router.push(`/workout/history/${workout.workoutId}`)
              }
            >
              {workout.name}
            </ListItem>
          );
        })
      )}
      {status === 'CanLoadMore' || status === 'LoadingMore' ? (
        <Button
          disabled={status === 'LoadingMore'}
          label={status === 'LoadingMore' ? 'Loading…' : 'Load more Workouts'}
          modifiers={[accessibilityModifier('Load more completed Workouts')]}
          onPress={() => loadMore(20)}
          variant="outlined"
        />
      ) : null}
    </NativeScreen>
  );
}
