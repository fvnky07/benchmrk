import { Button, Column, RNHostView, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { effortInScale } from '@repo/backend/convex/domain/effort';
import { useQuery } from 'convex/react';
import {
  type ErrorBoundaryProps,
  router,
  useLocalSearchParams,
} from 'expo-router';
import { Chart } from '@/components/charts/chart';
import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { SectionHeader } from '@/components/native/section-header';
import { StatRow } from '@/components/native/stat-tile';
import {
  accessibilityModifier,
  font,
  space,
  tabularDigits,
  textColor,
  useCardContentWidth,
  useColors,
} from '@/lib/ui';
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
  const colors = useColors();
  const code = errorCode(error);
  return (
    <NativeScreen>
      <Card padding={space.lg} spacing={space.xs}>
        <Text
          textStyle={{ ...font.section, color: textColor(colors.onSurface) }}
        >
          {code === 'NOT_FOUND'
            ? 'Workout not found'
            : 'Could not load Workout'}
        </Text>
        <Text
          textStyle={{
            ...font.caption,
            color: textColor(colors.onSurfaceVariant),
          }}
        >
          {ERROR_COPY[code ?? ''] ?? 'Try again to load this Workout.'}
        </Text>
      </Card>
      {code !== 'NOT_FOUND' ? (
        <Button
          label="Try again"
          modifiers={[accessibilityModifier('Try loading this Workout again')]}
          onPress={() => void retry()}
        />
      ) : null}
      <Button
        label="Back to history"
        modifiers={[accessibilityModifier('Back to Workout history')]}
        onPress={() => router.dismissTo('/workout/history')}
        variant="outlined"
      />
    </NativeScreen>
  );
}

export default function WorkoutHistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const chartWidth = useCardContentWidth();
  const workout = useQuery(api.history.get, {
    workoutId: id as Id<'workouts'>,
  });
  const settings = useQuery(api.memberSettings.get);
  const groupRecapId = useQuery(api.recaps.forWorkout, {
    workoutId: id as Id<'workouts'>,
  });

  const caption = {
    ...font.caption,
    color: textColor(colors.onSurfaceVariant),
  };
  const strongCaption = {
    ...font.caption,
    color: textColor(colors.onSurface),
  };

  if (workout === undefined || settings === undefined) {
    return (
      <NativeScreen>
        <Text
          textStyle={{
            ...font.body,
            color: textColor(colors.onSurfaceVariant),
          }}
        >
          Loading Workout…
        </Text>
      </NativeScreen>
    );
  }

  if (settings === null) {
    return (
      <NativeScreen>
        <Card padding={space.lg} spacing={space.xs}>
          <Text
            textStyle={{ ...font.section, color: textColor(colors.onSurface) }}
          >
            Workout settings unavailable
          </Text>
          <Text textStyle={caption}>
            Return to history and try again to show this Workout in your units.
          </Text>
        </Card>
        <Button
          label="Back to history"
          modifiers={[accessibilityModifier('Back to Workout history')]}
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
  const setsDone = workout.exercises.reduce(
    (count, exercise) =>
      count + exercise.sets.filter((set) => set.completedAt !== null).length,
    0
  );
  const valueText = {
    ...font.bodyStrong,
    color: textColor(colors.onSurface),
  };

  return (
    <NativeScreen>
      <Column spacing={space.xs}>
        <Text
          textStyle={{ ...font.heading, color: textColor(colors.onSurface) }}
        >
          {workout.name}
        </Text>
        <Text textStyle={caption}>
          {new Date(workout.startedAt).toLocaleString()}
        </Text>
      </Column>
      <StatRow
        tiles={[
          { label: 'Duration', value: formatClock(workout.durationSeconds) },
          { label: 'Sets', value: String(setsDone) },
        ]}
      />
      <Card padding={space.lg} spacing={space.sm}>
        <Text textStyle={caption}>
          {targetDurationSeconds === null || difference === null
            ? 'No target duration for this Workout'
            : `Target ${formatMinutes(targetDurationSeconds)} · ${difference === 0 ? 'On target' : `${formatMinutes(Math.abs(difference))} ${difference > 0 ? 'over' : 'under'} target`}`}
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
        <Text textStyle={strongCaption}>{timeSummary}</Text>
        <Text textStyle={caption}>
          Estimates from when you edited and logged each Set; measurement starts
          at the first logged Set.
        </Text>
        {time.adherence ? (
          <>
            <Text textStyle={strongCaption}>
              {`Rest ${formatClock(time.adherence.actualSeconds)} vs ${formatClock(time.adherence.plannedSeconds)} planned`}
            </Text>
            <Text textStyle={caption}>
              Average actual rest vs planned, not a score
            </Text>
          </>
        ) : null}
      </Card>
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
      {workout.note ? (
        <Card>
          <CardRow supportingText={workout.note}>Workout note</CardRow>
        </Card>
      ) : null}
      {workout.exercises.map((exercise) => {
        const { lastTime, suggested, basis, repRange } = exercise.targets;
        const targeted =
          exercise.type === 'strength' || exercise.type === 'bodyweight';
        const unitLabel = targeted ? ` (${settings.units})` : '';
        return (
          <Column key={exercise.workoutExerciseId} spacing={space.sm}>
            <SectionHeader
              title={exercise.name}
              supportingText={exercise.skipped ? 'Skipped' : undefined}
            />
            <Card divided>
              {exercise.standingNote ? (
                <CardRow
                  key="standing-note"
                  supportingText={exercise.standingNote}
                >
                  Standing Exercise note
                </CardRow>
              ) : null}
              {exercise.sets.flatMap((set) => [
                <CardRow
                  key={set.setId}
                  supportingText={
                    set.completedAt === null
                      ? 'Not logged'
                      : set.rpe === null
                        ? 'Effort not checked'
                        : `${settings.effortScale} ${formatEffort(effortInScale(set.rpe, settings.effortScale))}`
                  }
                  trailing={
                    set.completedAt === null ? undefined : (
                      <Text textStyle={valueText} modifiers={tabularDigits()}>
                        {`${setSummary(set, settings.units)}${set.weightKg !== null && set.reps !== null ? ` ${settings.units}` : ''}`}
                      </Text>
                    )
                  }
                >
                  {`Set ${set.order + 1} · ${SET_TYPE_LABELS[set.type]}`}
                </CardRow>,
                set.note ? (
                  <CardRow key={`${set.setId}-note`} supportingText={set.note}>
                    Set note
                  </CardRow>
                ) : null,
              ])}
              <CardRow
                key="last-time"
                supportingText={
                  lastTime
                    ? lastTime
                        .map((set) => setSummary(set, settings.units))
                        .join(' · ')
                    : 'None before this Workout'
                }
              >
                {`Last time${unitLabel}`}
              </CardRow>
              <CardRow
                key="suggested-next"
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
              </CardRow>
              {basis && targeted ? (
                <CardRow
                  key="why"
                  supportingText={whyText(
                    basis,
                    repRange,
                    settings.effortScale
                  )}
                >
                  Why
                </CardRow>
              ) : null}
              <CardRow
                key="exercise-time"
                supportingText={
                  exercise.time
                    ? `Working ≈ ${formatMinutes(exercise.time.workingSeconds)} · Rest ≈ ${formatMinutes(exercise.time.restSeconds)} · Transitions ≈ ${formatMinutes(exercise.time.transitionSeconds)}`
                    : 'No logged Sets to measure'
                }
              >
                Exercise time
              </CardRow>
              {exercise.time?.adherence ? (
                <CardRow
                  key="rest-adherence"
                  supportingText="Average actual rest vs planned"
                >
                  {`Rest ${formatClock(exercise.time.adherence.actualSeconds)} vs ${formatClock(exercise.time.adherence.plannedSeconds)} planned`}
                </CardRow>
              ) : null}
            </Card>
            {lastTime && targeted ? (
              <Text textStyle={caption}>
                {lastTime
                  .map((set) =>
                    set.rpe === null
                      ? 'Effort not checked'
                      : `${settings.effortScale} ${formatEffort(effortInScale(set.rpe, settings.effortScale))}`
                  )
                  .join(' · ')}
              </Text>
            ) : null}
            {basis?.edited ? (
              <Text textStyle={caption}>Your own target for this Workout.</Text>
            ) : null}
            {basis?.effortNotChecked && lastTime ? (
              <Text textStyle={caption}>
                {effortNotCheckedText(
                  lastTime.filter((set) => set.rpe === null).length,
                  lastTime.length
                )}
              </Text>
            ) : null}
            {basis?.plateau ? (
              <Text textStyle={caption}>{PLATEAU_TEXT}</Text>
            ) : null}
          </Column>
        );
      })}
    </NativeScreen>
  );
}
