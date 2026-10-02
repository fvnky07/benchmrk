import { Button, ListItem, Text } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { api } from '@repo/backend/convex/_generated/api';
import { usePaginatedQuery } from 'convex/react';
import { type ErrorBoundaryProps, router } from 'expo-router';
import { Platform } from 'react-native';

import { NativeScreen } from '@/components/native/native-screen';
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
        modifiers={[
          Platform.OS === 'ios'
            ? accessibilityLabel('Try loading Workout history again')
            : semantics({
                contentDescription: 'Try loading Workout history again',
              }),
        ]}
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
              modifiers={[
                Platform.OS === 'ios'
                  ? accessibilityLabel(label)
                  : semantics({ contentDescription: label }),
              ]}
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
          modifiers={[
            Platform.OS === 'ios'
              ? accessibilityLabel('Load more completed Workouts')
              : semantics({
                  contentDescription: 'Load more completed Workouts',
                }),
          ]}
          onPress={() => loadMore(20)}
          variant="outlined"
        />
      ) : null}
    </NativeScreen>
  );
}
