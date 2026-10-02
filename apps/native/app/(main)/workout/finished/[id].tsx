import { Button, ListItem, RNHostView, Text } from '@expo/ui';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Chart } from '@/components/charts/chart';
import { NativeScreen } from '@/components/native/native-screen';
import { SaveToRoutine } from '@/components/workout/save-to-routine';
import { formatClock } from '@/lib/workout/format';
import { formatMinutes } from '@/lib/workout/time';

export default function WorkoutFinishedScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const workoutId = params.id as Id<'workouts'>;
  const workout = useQuery(api.workouts.get, { workoutId });
  const groupRecapId = useQuery(api.recaps.forWorkout, { workoutId });
  const setEndTime = useMutation(api.workouts.setEndTime);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (workout === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>Loading Workout…</Text>
      </NativeScreen>
    );
  }

  if (workout === null || workout.status === 'active') {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
          Workout not found
        </Text>
        <Button label="Done" onPress={() => router.dismissTo('/workout')} />
      </NativeScreen>
    );
  }

  if (workout.status === 'abandoned') {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
          Workout discarded
        </Text>
        <ListItem supportingText="No Sets were logged, so this Workout isn’t kept in your history.">
          Nothing logged
        </ListItem>
        <Button label="Done" onPress={() => router.dismissTo('/workout')} />
      </NativeScreen>
    );
  }

  const finishedAt = workout.finishedAt ?? workout.startedAt;
  const durationSeconds = (finishedAt - workout.startedAt) / 1000;
  const { time, targetDurationSeconds } = workout;

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        {workout.finishReason === 'terminated_early'
          ? 'Workout ended early'
          : 'Workout complete'}
      </Text>
      <ListItem supportingText={workout.name}>
        {`${workout.progress.done} of ${workout.progress.total} planned Sets`}
      </ListItem>
      <ListItem
        supportingText={
          targetDurationSeconds === null
            ? 'From start to the end time below'
            : `Target ${formatMinutes(targetDurationSeconds)} · ${
                durationSeconds > targetDurationSeconds ? '+' : '−'
              }${formatMinutes(Math.abs(durationSeconds - targetDurationSeconds))}`
        }
      >
        {`Duration ${formatClock(durationSeconds)}`}
      </ListItem>
      <RNHostView matchContents>
        <Chart
          kind="stackedBar"
          horizontal
          bars={[
            {
              label: 'Time',
              segments: [
                {
                  label: 'Working',
                  value: time.workingSeconds,
                  tone: 'accent',
                },
                {
                  label: 'Rest',
                  value: time.restSeconds,
                  tone: 'secondary',
                },
                {
                  label: 'Transitions',
                  value: time.transitionSeconds,
                  tone: 'tertiary',
                },
              ],
            },
          ]}
          summary={`Time breakdown: working ${formatMinutes(time.workingSeconds)}, rest ${formatMinutes(time.restSeconds)}, transitions ${formatMinutes(time.transitionSeconds)}`}
        />
      </RNHostView>
      <ListItem supportingText="Estimates, from when you edited and logged each Set">
        {`Working ≈ ${formatMinutes(time.workingSeconds)} · Rest ≈ ${formatMinutes(time.restSeconds)} · Transitions ≈ ${formatMinutes(time.transitionSeconds)}`}
      </ListItem>
      {time.adherence ? (
        <ListItem supportingText="Average actual rest vs planned">
          {`Rest ${formatClock(time.adherence.actualSeconds)} vs ${formatClock(time.adherence.plannedSeconds)} planned`}
        </ListItem>
      ) : null}
      <ListItem supportingText="Defaults to your last completed Set. Change it if you forgot to finish.">
        End time
      </ListItem>
      <RNHostView matchContents>
        <DateTimePicker
          value={new Date(finishedAt)}
          mode="datetime"
          minimumDate={new Date(workout.startedAt)}
          maximumDate={new Date()}
          onValueChange={async (_event, date) => {
            try {
              setErrorMessage(null);
              await setEndTime({ workoutId, finishedAt: date.getTime() });
            } catch {
              setErrorMessage(
                'The end time must be after the start and not in the future.'
              );
            }
          }}
        />
      </RNHostView>
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Could not change</ListItem>
      ) : null}
      {groupRecapId ? (
        <Button
          label="Group recap"
          onPress={() =>
            router.push({
              pathname: '/workout/recap/[groupId]',
              params: { groupId: groupRecapId },
            })
          }
        />
      ) : null}
      <SaveToRoutine workoutId={workoutId} />
      <Button label="Done" onPress={() => router.dismissTo('/workout')} />
    </NativeScreen>
  );
}
