import LinkIcon from '@expo/material-symbols/link.xml';
import { Button, Column, Icon, Row, ScrollView, Text } from '@expo/ui';
import { Fragment } from 'react';

import { space, textColor, useColors } from '@/lib/ui';

const LINK = { ios: 'link', android: LinkIcon } as const;
const TILE_WIDTH = 116;
const TILE_PADDING = 10;
const TILE_RADIUS = 12;
/** Every tile draws this ring, in its own fill unless selected, so nothing shifts on selection. */
const RING_WIDTH = 2;
/** Room for the pips inside the padding and ring. */
const PIP_ROOM = TILE_WIDTH - 2 * (TILE_PADDING + RING_WIDTH);
const PIP_GAP = 3;

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
  // Highest, so tiles stand out on every container they sit on.
  const fill = colors.surfaceContainerHighest;
  const pipWidth = Math.max(
    6,
    PIP_ROOM / Math.max(exercise.sets.length, 1) - PIP_GAP
  );

  return (
    <Column
      spacing={6}
      onPress={onSelect}
      style={{
        padding: TILE_PADDING,
        width: TILE_WIDTH,
        borderRadius: TILE_RADIUS,
        borderWidth: RING_WIDTH,
        borderColor: selected ? colors.primary : fill,
        backgroundColor: fill,
        opacity: exercise.skipped ? 0.5 : 1,
      }}
    >
      <Text
        numberOfLines={2}
        textStyle={{
          fontSize: 14,
          fontWeight: '600',
          color: textColor(colors.onSurface),
        }}
      >
        {exercise.name}
      </Text>
      <Row spacing={PIP_GAP}>
        {exercise.sets.map((set, setIndex) => {
          // A rounded outline needs a fill on Android, or the ring colour floods it.
          const outlined = pipVariant === 'group' && set.current && !set.done;
          return (
            <Column
              // biome-ignore lint/suspicious/noArrayIndexKey: one segment per Set position
              key={setIndex}
              style={{
                height: pipVariant === 'group' ? 6 : 4,
                width: pipWidth,
                borderRadius: 2,
                ...(outlined
                  ? { borderWidth: 1, borderColor: colors.primary }
                  : {}),
                backgroundColor: set.done
                  ? colors.primary
                  : outlined
                    ? fill
                    : set.current
                      ? colors.onSurface
                      : colors.outline,
              }}
            />
          );
        })}
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
      <Row alignment="center" spacing={space.sm}>
        {exercises.map((exercise, index) => (
          <Fragment key={exercise.key}>
            <ExerciseTile
              exercise={exercise}
              selected={index === selectedIndex}
              onSelect={onSelect ? () => onSelect(index) : undefined}
            />
            {exercise.linkedToNext ? (
              <Icon
                name={LINK}
                size={16}
                color={colors.primary}
                accessibilityLabel={`${exercise.name} alternates with the next Exercise`}
              />
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
