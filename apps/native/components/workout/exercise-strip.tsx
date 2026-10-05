import LinkIcon from '@expo/material-symbols/link.xml';
import { Button, Column, Icon, Row, ScrollView, Text } from '@expo/ui';
import { type ComponentProps, Fragment } from 'react';

import { useColors } from '@/lib/ui';

const LINK = { ios: 'link', android: LinkIcon } as const satisfies Readonly<
  Record<'ios' | 'android', ComponentProps<typeof Icon>['name']>
>;

export type StripExercise = {
  key: string;
  name: string;
  /** Skipped for this Workout; shown dimmed. */
  skipped?: boolean;
  /** In Alternating sets with the next Exercise; a link joins their tiles. */
  linkedToNext?: boolean;
  sets: { done: boolean; current?: boolean }[];
};

type ExerciseStripProps = {
  exercises: StripExercise[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  onAdd?: () => void;
};

/** Shared tile; Group pips outline the current Set without changing Workout pips. */
export function ExerciseTile({
  exercise,
  selected = false,
  onSelect,
  pipVariant = 'workout',
}: Readonly<{
  exercise: StripExercise;
  selected?: boolean;
  onSelect?: () => void;
  pipVariant?: 'workout' | 'group';
}>) {
  const colors = useColors();

  return (
    <Column
      spacing={6}
      onPress={onSelect}
      style={{
        padding: 10,
        width: 116,
        borderRadius: 12,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.primary : colors.outlineVariant,
        opacity: exercise.skipped ? 0.5 : 1,
      }}
    >
      <Text numberOfLines={2} textStyle={{ fontSize: 14, fontWeight: '600' }}>
        {exercise.name}
      </Text>
      <Row spacing={3}>
        {exercise.sets.map((set, setIndex) => (
          <Column
            // biome-ignore lint/suspicious/noArrayIndexKey: one segment per Set position
            key={setIndex}
            style={{
              height: pipVariant === 'group' ? 6 : 4,
              width: Math.max(6, 92 / Math.max(exercise.sets.length, 1) - 3),
              borderRadius: 2,
              borderWidth:
                pipVariant === 'group' && set.current && !set.done ? 1 : 0,
              borderColor: colors.primary,
              backgroundColor: set.done
                ? colors.primary
                : set.current
                  ? pipVariant === 'group'
                    ? 'transparent'
                    : colors.onSurface
                  : colors.outlineVariant,
            }}
          />
        ))}
      </Row>
    </Column>
  );
}

/**
 * A horizontally scrollable row of Exercise tiles, each underlined with one
 * segment per Set. The Workout screen and Group boxes share it.
 */
export function ExerciseStrip({
  exercises,
  selectedIndex,
  onSelect,
  onAdd,
}: Readonly<ExerciseStripProps>) {
  const colors = useColors();

  return (
    <ScrollView direction="horizontal" showsIndicators={false}>
      <Row spacing={8}>
        {exercises.map((exercise, index) => (
          <Fragment key={exercise.key}>
            <ExerciseTile
              exercise={exercise}
              selected={index === selectedIndex}
              onSelect={onSelect ? () => onSelect(index) : undefined}
            />
            {exercise.linkedToNext ? (
              <Column alignment="center" style={{ paddingVertical: 24 }}>
                <Icon
                  name={LINK}
                  size={16}
                  color={colors.primary}
                  accessibilityLabel={`${exercise.name} alternates with the next Exercise`}
                />
              </Column>
            ) : null}
          </Fragment>
        ))}
        {onAdd ? (
          <Button label="Add Exercise" variant="outlined" onPress={onAdd} />
        ) : null}
      </Row>
    </ScrollView>
  );
}
