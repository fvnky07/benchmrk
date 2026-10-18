import { Button, Column, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { useState } from 'react';

import { Card, CardRow } from '@/components/native/card';
import { SectionHeader } from '@/components/native/section-header';
import { font, space, textColor, useColors } from '@/lib/ui';
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
  const colors = useColors();

  return (
    <Column spacing={space.xs}>
      <Text textStyle={{ ...font.label, color: textColor(colors.onSurface) }}>
        {title}
      </Text>
      {shapes.map((shape, index) => (
        <Text
          // biome-ignore lint/suspicious/noArrayIndexKey: a Routine can list an Exercise twice
          key={index}
          textStyle={{
            ...font.caption,
            color: textColor(colors.onSurfaceVariant),
          }}
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
  const colors = useColors();
  const plan = useQuery(api.workoutStructure.getChanges, { workoutId });
  const saveToRoutine = useMutation(api.workoutStructure.saveToRoutine);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isSaved) {
    return (
      <Column spacing={space.sm}>
        <SectionHeader title="Update Routine" />
        <Card>
          <CardRow supportingText="Your next Workout from it starts with these changes.">
            Routine updated
          </CardRow>
        </Card>
      </Column>
    );
  }
  if (!plan || plan.changes.length === 0) return null;

  return (
    <Column spacing={space.sm}>
      <SectionHeader
        title="Update Routine"
        supportingText="Save these changes as the new default"
      />
      <Card padding={space.lg} spacing={space.md}>
        <Column spacing={space.xs}>
          {plan.changes.map((change) => (
            <Text
              key={describe(change)}
              textStyle={{ ...font.body, color: textColor(colors.onSurface) }}
            >
              {`• ${describe(change)}`}
            </Text>
          ))}
        </Column>
        <ShapeList title={`${plan.routineName} now`} shapes={plan.before} />
        <ShapeList title="After saving" shapes={plan.after} />
        {errorMessage ? (
          <Column spacing={space.xs}>
            <Text
              textStyle={{ ...font.label, color: textColor(colors.onSurface) }}
            >
              Not saved
            </Text>
            <Text
              textStyle={{ ...font.caption, color: textColor(colors.error) }}
            >
              {errorMessage}
            </Text>
          </Column>
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
      </Card>
    </Column>
  );
}
