import { Button, Column, ListItem, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { useState } from 'react';

import { formatClock } from '@/lib/workout/format';

type Plan = NonNullable<
  FunctionReturnType<typeof api.workoutStructure.getChanges>
>;
type Change = Plan['changes'][number];
type Shape = Plan['before'][number];

function restText(seconds: number | null): string {
  return seconds === null ? 'default rest' : `${formatClock(seconds)} rest`;
}

function describe(change: Change): string {
  switch (change.kind) {
    case 'added':
      return `Added ${change.exercise}`;
    case 'removed':
      return `Removed ${change.exercise}`;
    case 'swapped':
      return `Swapped ${change.from} for ${change.to}`;
    case 'sets':
      return `${change.exercise}: ${change.from} → ${change.to} Sets`;
    case 'rest':
      return `${change.exercise}: ${restText(change.from)} → ${restText(change.to)}`;
    case 'linked':
      return `Linked ${change.exercises.join(' ↔ ')} as Alternating sets`;
    case 'unlinked':
      return `Unlinked ${change.exercises.join(' ↔ ')}`;
    case 'blockRest':
      return `${change.exercises.join(' ↔ ')}: ${restText(change.from)} → ${restText(change.to)} after each round`;
    case 'order':
      return 'Exercise order changed';
  }
}

function ShapeList({
  title,
  shapes,
}: {
  title: string;
  shapes: readonly Shape[];
}) {
  return (
    <Column spacing={4}>
      <Text textStyle={{ fontSize: 15, fontWeight: '700' }}>{title}</Text>
      {shapes.map((shape, index) => (
        <Text
          // biome-ignore lint/suspicious/noArrayIndexKey: a Routine can list an Exercise twice
          key={index}
          textStyle={{ fontSize: 15 }}
        >
          {`${index + 1}. ${shape.name} · ${shape.sets} Sets · ${restText(shape.restSeconds)}${shape.linkedToNext ? ' · alternates with the next' : ''}`}
        </Text>
      ))}
    </Column>
  );
}

/**
 * Offered at finish when the Workout's structure differs from its Routine.
 * Saving applies exactly the "after" list shown; otherwise the Routine stays.
 */
export function SaveToRoutine({
  workoutId,
}: Readonly<{ workoutId: Id<'workouts'> }>) {
  const plan = useQuery(api.workoutStructure.getChanges, { workoutId });
  const saveToRoutine = useMutation(api.workoutStructure.saveToRoutine);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isSaved) {
    return (
      <ListItem supportingText="Your next Workout from it starts with these changes.">
        Routine updated
      </ListItem>
    );
  }
  if (!plan || plan.changes.length === 0) return null;

  return (
    <Column spacing={12}>
      <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>
        Save changes to Routine?
      </Text>
      <Column spacing={4}>
        {plan.changes.map((change) => (
          <Text key={describe(change)} textStyle={{ fontSize: 15 }}>
            {`• ${describe(change)}`}
          </Text>
        ))}
      </Column>
      <ShapeList title={`${plan.routineName} now`} shapes={plan.before} />
      <ShapeList title="After saving" shapes={plan.after} />
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Not saved</ListItem>
      ) : null}
      <Button
        label="Save changes to Routine"
        onPress={async () => {
          try {
            setErrorMessage(null);
            await saveToRoutine({ workoutId });
            setIsSaved(true);
          } catch {
            setErrorMessage('Could not update the Routine. Try again.');
          }
        }}
      />
    </Column>
  );
}
