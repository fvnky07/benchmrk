import { Button, Column, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useState } from 'react';

import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { PrimaryButton } from '@/components/native/primary-button';
import { ScreenTitle } from '@/components/native/screen-title';
import { SectionHeader } from '@/components/native/section-header';
import { StatRow } from '@/components/native/stat-tile';
import {
  accessibilityModifier,
  font,
  space,
  tabularDigits,
  textColor,
  useColors,
  useContentWidth,
} from '@/lib/ui';
import { formatClock } from '@/lib/workout/format';
import { rangeStart } from '@/lib/workout/stats';
import { useNow } from '@/lib/workout/use-now';
import { useStartWorkout } from '@/lib/workout/use-start-workout';

export default function WorkoutScreen() {
  const colors = useColors();
  const contentWidth = useContentWidth();
  const routines = useQuery(api.routines.list);
  const activeWorkout = useQuery(api.workouts.getActive);
  const startWorkout = useStartWorkout();
  const now = useNow();
  const thisWeek = useQuery(api.history.stats, {
    since: rangeStart('1W', now),
  });
  const createRoutine = useMutation(api.routines.create);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const create = async () => {
    try {
      setIsCreating(true);
      setErrorMessage(null);
      const routineId = await createRoutine({ name: newName });
      setNewName('');
      router.push(`/workout/routine/${routineId}`);
    } catch {
      setErrorMessage('Could not create this Routine. Try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const caption = {
    ...font.caption,
    color: textColor(colors.onSurfaceVariant),
  };

  return (
    <NativeScreen edges={['top']}>
      <ScreenTitle title="Workouts" />
      {activeWorkout ? (
        <Card tone="high" padding={space.lg} spacing={space.sm}>
          <Text
            textStyle={{ ...font.section, color: textColor(colors.onSurface) }}
          >
            {activeWorkout.name}
          </Text>
          <Text textStyle={caption} modifiers={tabularDigits()}>
            {`In progress · ${formatClock(
              (now - activeWorkout.startedAt) / 1000
            )} · ${activeWorkout.progress.done}/${activeWorkout.progress.total} Sets`}
          </Text>
          <PrimaryButton
            label="Resume"
            width={contentWidth - 2 * space.lg}
            onPress={() => router.push('/workout/active')}
          />
        </Card>
      ) : (
        <PrimaryButton
          label="Start empty Workout"
          onPress={() =>
            startWorkout().catch(() =>
              setErrorMessage('Could not start a Workout. Try again.')
            )
          }
        />
      )}
      <Column spacing={space.sm}>
        <SectionHeader title="This week" />
        <StatRow
          tiles={[
            {
              label: 'Workouts',
              value: thisWeek ? String(thisWeek.length) : '—',
            },
            {
              label: 'Sets',
              value: thisWeek
                ? String(
                    thisWeek.reduce((sum, workout) => sum + workout.sets, 0)
                  )
                : '—',
            },
          ]}
        />
      </Column>
      <Card divided>
        <CardRow
          chevron
          modifiers={[accessibilityModifier('View completed Workout history')]}
          onPress={() => router.push('/workout/history')}
          supportingText="Completed Workouts, Sets, targets, notes and time"
        >
          History
        </CardRow>
        <CardRow
          chevron
          onPress={() => router.push('/workout/group')}
          supportingText="Train together: create a Group or join with a code"
        >
          Group
        </CardRow>
      </Card>
      <Column spacing={space.sm}>
        <SectionHeader title="Routines" />
        {routines === undefined ? (
          <Card padding={space.lg}>
            <Text textStyle={caption}>Loading Routines…</Text>
          </Card>
        ) : routines.length === 0 ? (
          <Card padding={space.lg} spacing={space.xs}>
            <Text
              textStyle={{
                ...font.bodyStrong,
                color: textColor(colors.onSurface),
              }}
            >
              No Routines yet
            </Text>
            <Text textStyle={caption}>
              Build a Routine to plan your Exercises, Sets and Rep ranges.
            </Text>
          </Card>
        ) : (
          <Card divided>
            {routines.map((routine) => (
              <CardRow
                key={routine._id}
                chevron
                onPress={() => router.push(`/workout/routine/${routine._id}`)}
                supportingText={`${routine.exerciseCount} ${
                  routine.exerciseCount === 1 ? 'Exercise' : 'Exercises'
                }`}
              >
                {routine.name}
              </CardRow>
            ))}
          </Card>
        )}
      </Column>
      <Card padding={space.lg} spacing={space.md}>
        <NativeTextField
          label="New Routine"
          placeholder="For example, Upper A"
          value={newName}
          onChangeText={setNewName}
        />
        <Button
          disabled={isCreating || newName.trim().length === 0}
          label={isCreating ? 'Creating…' : 'Create Routine'}
          onPress={create}
        />
      </Card>
      {errorMessage ? (
        <Card tone="high" padding={space.lg} spacing={space.xs}>
          <Text
            textStyle={{ ...font.label, color: textColor(colors.onSurface) }}
          >
            Could not create
          </Text>
          <Text textStyle={{ ...font.caption, color: textColor(colors.error) }}>
            {errorMessage}
          </Text>
        </Card>
      ) : null}
    </NativeScreen>
  );
}
