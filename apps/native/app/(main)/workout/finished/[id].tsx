import { Column, RNHostView, Text } from '@expo/ui';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Chart } from '@/components/charts/chart';
import { Card, CardRow } from '@/components/native/card';
import { DockedScreen } from '@/components/native/docked-screen';
import { PrimaryButton } from '@/components/native/primary-button';
import { StatRow } from '@/components/native/stat-tile';
import { SaveToRoutine } from '@/components/workout/save-to-routine';
import {
  font,
  space,
  textColor,
  useCardContentWidth,
  useColors,
  useContentWidth,
} from '@/lib/ui';
import { formatClock } from '@/lib/workout/format';
import { durationDifference, formatMinutes } from '@/lib/workout/time';

export default function WorkoutFinishedScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const workoutId = params.id as Id<'workouts'>;
  const colors = useColors();
  const chartWidth = useCardContentWidth();
  // The dock insets its content 12 from the edges, not the column's 24.
  const dockWidth = useContentWidth() + 2 * (space.screen - space.md);
  const workout = useQuery(api.workouts.get, { workoutId });
  const groupRecapId = useQuery(api.recaps.forWorkout, { workoutId });
  const setEndTime = useMutation(api.workouts.setEndTime);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const caption = {
    ...font.caption,
    color: textColor(colors.onSurfaceVariant),
  };
  const strongCaption = {
    ...font.caption,
    color: textColor(colors.onSurface),
  };
  const done = (
    <PrimaryButton
      label="Done"
      width={dockWidth}
      onPress={() => router.dismissTo('/workout')}
    />
  );

  if (workout === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <DockedScreen>
          <Text
            textStyle={{
              ...font.body,
              color: textColor(colors.onSurfaceVariant),
            }}
          >
            Loading Workout…
          </Text>
        </DockedScreen>
      </>
    );
  }

  if (workout === null || workout.status === 'active') {
    return (
      <>
        <Stack.Screen options={{ title: 'Workout not found' }} />
        <DockedScreen dock={done}>{null}</DockedScreen>
      </>
    );
  }

  if (workout.status === 'abandoned') {
    return (
      <>
        <Stack.Screen options={{ title: 'Workout discarded' }} />
        <DockedScreen dock={done}>
          <Card>
            <CardRow supportingText="No Sets were logged, so this Workout isn’t kept in your history.">
              Nothing logged
            </CardRow>
          </Card>
        </DockedScreen>
      </>
    );
  }

  const finishedAt = workout.finishedAt ?? workout.startedAt;
  const durationSeconds = (finishedAt - workout.startedAt) / 1000;
  const { time, targetDurationSeconds } = workout;

  return (
    <>
      <Stack.Screen
        options={{
          title:
            workout.finishReason === 'terminated_early'
              ? 'Workout ended early'
              : 'Workout complete',
        }}
      />
      <DockedScreen dock={done}>
        <Text
          textStyle={{ ...font.heading, color: textColor(colors.onSurface) }}
        >
          {workout.name}
        </Text>
        <StatRow
          tiles={[
            {
              label: 'Sets',
              value: String(workout.progress.done),
              unit: `of ${workout.progress.total}`,
            },
            { label: 'Duration', value: formatClock(durationSeconds) },
          ]}
        />
        <Card padding={space.lg} spacing={space.sm}>
          <Text textStyle={caption}>
            {targetDurationSeconds === null
              ? 'From start to the end time below'
              : `Target ${formatMinutes(targetDurationSeconds)} · ${durationDifference(durationSeconds, targetDurationSeconds)}`}
          </Text>
          <RNHostView matchContents>
            <Chart
              kind="stackedBar"
              width={chartWidth}
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
          <Text textStyle={strongCaption}>
            {`Working ≈ ${formatMinutes(time.workingSeconds)} · Rest ≈ ${formatMinutes(time.restSeconds)} · Transitions ≈ ${formatMinutes(time.transitionSeconds)}`}
          </Text>
          <Text textStyle={caption}>
            Estimates, from when you edited and logged each Set
          </Text>
          {time.adherence ? (
            <>
              <Text textStyle={strongCaption}>
                {`Rest ${formatClock(time.adherence.actualSeconds)} vs ${formatClock(time.adherence.plannedSeconds)} planned`}
              </Text>
              <Text textStyle={caption}>Average actual rest vs planned</Text>
            </>
          ) : null}
        </Card>
        <Card>
          <CardRow supportingText="Defaults to your last completed Set. Change it if you forgot to finish.">
            End time
          </CardRow>
          <Column
            style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}
          >
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
          </Column>
        </Card>
        {errorMessage ? (
          <Card tone="high" padding={space.lg} spacing={space.xs}>
            <Text
              textStyle={{ ...font.label, color: textColor(colors.onSurface) }}
            >
              Could not change
            </Text>
            <Text
              textStyle={{ ...font.caption, color: textColor(colors.error) }}
            >
              {errorMessage}
            </Text>
          </Card>
        ) : null}
        <SaveToRoutine workoutId={workoutId} />
        {groupRecapId ? (
          <Card>
            <CardRow
              chevron
              onPress={() =>
                router.push({
                  pathname: '/workout/recap/[groupId]',
                  params: { groupId: groupRecapId },
                })
              }
            >
              Group recap
            </CardRow>
          </Card>
        ) : null}
      </DockedScreen>
    </>
  );
}
