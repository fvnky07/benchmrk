import { Button, Column, ListItem, RNHostView, Text } from '@expo/ui';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { effortInScale } from '@repo/backend/convex/domain/effort';
import { useQuery } from 'convex/react';
import {
  type ErrorBoundaryProps,
  router,
  useLocalSearchParams,
} from 'expo-router';
import { Platform } from 'react-native';

import { Chart } from '@/components/charts/chart';
import { NativeScreen } from '@/components/native/native-screen';
import { errorCode, formatClock, formatEffort } from '@/lib/workout/format';
import {
  effortNotCheckedText,
  PLATEAU_TEXT,
  TIMED_TEXT,
  whyText,
} from '@/lib/workout/overload-copy';
import {
  SET_TYPE_LABELS,
  setSummary,
  targetText,
} from '@/lib/workout/set-entry';
import { formatMinutes } from '@/lib/workout/time';

const ERROR_COPY: Record<string, string> = {
  NOT_FOUND: 'This completed Workout could not be found in your history.',
};

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const code = errorCode(error);
  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
        {code === 'NOT_FOUND' ? 'Workout not found' : 'Could not load Workout'}
      </Text>
      <Text textStyle={{ fontSize: 17 }}>
        {ERROR_COPY[code ?? ''] ?? 'Try again to load this Workout.'}
      </Text>
      {code !== 'NOT_FOUND' ? (
        <Button
          label="Try again"
          modifiers={[
            Platform.OS === 'ios'
              ? accessibilityLabel('Try loading this Workout again')
              : semantics({
                  contentDescription: 'Try loading this Workout again',
                }),
          ]}
          onPress={() => void retry()}
        />
      ) : null}
      <Button
        label="Back to history"
        modifiers={[
          Platform.OS === 'ios'
            ? accessibilityLabel('Back to Workout history')
            : semantics({ contentDescription: 'Back to Workout history' }),
        ]}
        onPress={() => router.dismissTo('/workout/history')}
        variant="outlined"
      />
    </NativeScreen>
  );
}

export default function WorkoutHistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workout = useQuery(api.history.get, {
    workoutId: id as Id<'workouts'>,
  });
  const settings = useQuery(api.memberSettings.get);
  const groupRecapId = useQuery(api.recaps.forWorkout, {
    workoutId: id as Id<'workouts'>,
  });

  if (workout === undefined || settings === undefined) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>Loading Workout…</Text>
      </NativeScreen>
    );
  }

  if (settings === null) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
          Workout settings unavailable
        </Text>
        <Text textStyle={{ fontSize: 17 }}>
          Return to history and try again to show this Workout in your units.
        </Text>
        <Button
          label="Back to history"
          modifiers={[
            Platform.OS === 'ios'
              ? accessibilityLabel('Back to Workout history')
              : semantics({ contentDescription: 'Back to Workout history' }),
          ]}
          onPress={() => router.dismissTo('/workout/history')}
          variant="outlined"
        />
      </NativeScreen>
    );
  }

  const { time, targetDurationSeconds } = workout;
  const timeSummary = `Time breakdown: working ${formatMinutes(time.workingSeconds)}, rest ${formatMinutes(time.restSeconds)}, transitions ${formatMinutes(time.transitionSeconds)}.`;
  const difference =
    targetDurationSeconds === null
      ? null
      : workout.durationSeconds - targetDurationSeconds;

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        {workout.name}
      </Text>
      <Text textStyle={{ fontSize: 17 }}>
        {new Date(workout.startedAt).toLocaleString()}
      </Text>
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
      <ListItem
        supportingText={
          targetDurationSeconds === null || difference === null
            ? 'No target duration for this Workout'
            : `Target ${formatMinutes(targetDurationSeconds)} · ${difference === 0 ? 'On target' : `${formatMinutes(Math.abs(difference))} ${difference > 0 ? 'over' : 'under'} target`}`
        }
      >
        {`Duration ${formatClock(workout.durationSeconds)}`}
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
                { label: 'Rest', value: time.restSeconds, tone: 'secondary' },
                {
                  label: 'Transitions',
                  value: time.transitionSeconds,
                  tone: 'tertiary',
                },
              ],
            },
          ]}
          summary={timeSummary}
        />
      </RNHostView>
      <ListItem supportingText="Estimates from when you edited and logged each Set; measurement starts at the first logged Set.">
        {timeSummary}
      </ListItem>
      {time.adherence ? (
        <ListItem supportingText="Average actual rest vs planned, not a score">
          {`Rest ${formatClock(time.adherence.actualSeconds)} vs ${formatClock(time.adherence.plannedSeconds)} planned`}
        </ListItem>
      ) : null}
      {workout.note ? (
        <ListItem supportingText={workout.note}>Workout note</ListItem>
      ) : null}
      {workout.exercises.map((exercise) => {
        const { lastTime, suggested, basis, repRange } = exercise.targets;
        const targeted =
          exercise.type === 'strength' || exercise.type === 'bodyweight';
        const unitLabel = targeted ? ` (${settings.units})` : '';
        return (
          <Column key={exercise.workoutExerciseId} spacing={12}>
            <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
              {exercise.name}
            </Text>
            {exercise.skipped ? (
              <Text textStyle={{ fontSize: 17 }}>Skipped</Text>
            ) : null}
            {exercise.standingNote ? (
              <ListItem supportingText={exercise.standingNote}>
                Standing Exercise note
              </ListItem>
            ) : null}
            {exercise.sets.map((set) => {
              const effort =
                set.rpe === null
                  ? 'Effort not checked'
                  : `${settings.effortScale} ${formatEffort(effortInScale(set.rpe, settings.effortScale))}`;
              return (
                <Column key={set.setId} spacing={4}>
                  <ListItem
                    supportingText={
                      set.completedAt === null
                        ? 'Not logged'
                        : `${setSummary(set, settings.units)}${set.weightKg !== null && set.reps !== null ? ` ${settings.units}` : ''} · ${effort}`
                    }
                  >
                    {`Set ${set.order + 1} · ${SET_TYPE_LABELS[set.type]}`}
                  </ListItem>
                  {set.note ? (
                    <ListItem supportingText={set.note}>Set note</ListItem>
                  ) : null}
                </Column>
              );
            })}
            <ListItem
              supportingText={
                lastTime
                  ? lastTime
                      .map((set) => setSummary(set, settings.units))
                      .join(' · ')
                  : 'None before this Workout'
              }
            >
              {`Last time${unitLabel}`}
            </ListItem>
            {lastTime && targeted ? (
              <Text textStyle={{ fontSize: 15 }}>
                {lastTime
                  .map((set) =>
                    set.rpe === null
                      ? 'Effort not checked'
                      : `${settings.effortScale} ${formatEffort(effortInScale(set.rpe, settings.effortScale))}`
                  )
                  .join(' · ')}
              </Text>
            ) : null}
            <ListItem
              supportingText={
                !targeted
                  ? TIMED_TEXT
                  : basis?.declined
                    ? 'Declined for this Workout'
                    : suggested.length === 0
                      ? 'No saved target for this Workout'
                      : suggested
                          .map((target) => targetText(target, settings.units))
                          .join(' · ')
              }
            >
              {`Suggested next${unitLabel}`}
            </ListItem>
            {basis?.edited ? (
              <Text textStyle={{ fontSize: 15 }}>
                Your own target for this Workout.
              </Text>
            ) : null}
            {basis && targeted ? (
              <ListItem
                supportingText={whyText(basis, repRange, settings.effortScale)}
              >
                Why
              </ListItem>
            ) : null}
            {basis?.effortNotChecked && lastTime ? (
              <Text textStyle={{ fontSize: 15 }}>
                {effortNotCheckedText(
                  lastTime.filter((set) => set.rpe === null).length,
                  lastTime.length
                )}
              </Text>
            ) : null}
            {basis?.plateau ? (
              <Text textStyle={{ fontSize: 15 }}>{PLATEAU_TEXT}</Text>
            ) : null}
            <ListItem
              supportingText={
                exercise.time
                  ? `Working ≈ ${formatMinutes(exercise.time.workingSeconds)} · Rest ≈ ${formatMinutes(exercise.time.restSeconds)} · Transitions ≈ ${formatMinutes(exercise.time.transitionSeconds)}`
                  : 'No logged Sets to measure'
              }
            >
              Exercise time
            </ListItem>
            {exercise.time?.adherence ? (
              <ListItem supportingText="Average actual rest vs planned">
                {`Rest ${formatClock(exercise.time.adherence.actualSeconds)} vs ${formatClock(exercise.time.adherence.plannedSeconds)} planned`}
              </ListItem>
            ) : null}
          </Column>
        );
      })}
    </NativeScreen>
  );
}
