import LinkIcon from '@expo/material-symbols/link.xml';
import { Button, Column, Icon, Row, ScrollView, Text } from '@expo/ui';
import { Fragment } from 'react';

import { useAppearance } from '@/lib/ui';

const LINK = { ios: 'link', android: LinkIcon } as const;

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
  const { navigationTheme } = useAppearance();
  const { colors } = navigationTheme;

  return (
    <ScrollView direction="horizontal" showsIndicators={false}>
      <Row spacing={8}>
        {exercises.map((exercise, index) => (
          <Fragment key={exercise.key}>
            <Column
              spacing={6}
              onPress={onSelect ? () => onSelect(index) : undefined}
              style={{
                padding: 10,
                width: 116,
                borderRadius: 12,
                borderWidth: index === selectedIndex ? 2 : 1,
                borderColor:
                  index === selectedIndex ? colors.primary : colors.border,
                opacity: exercise.skipped ? 0.5 : 1,
              }}
            >
              <Text
                numberOfLines={2}
                textStyle={{ fontSize: 14, fontWeight: '600' }}
              >
                {exercise.name}
              </Text>
              <Row spacing={3}>
                {exercise.sets.map((set, setIndex) => (
                  <Column
                    // biome-ignore lint/suspicious/noArrayIndexKey: one segment per Set position
                    key={setIndex}
                    style={{
                      height: 4,
                      width: Math.max(
                        6,
                        92 / Math.max(exercise.sets.length, 1) - 3
                      ),
                      borderRadius: 2,
                      backgroundColor: set.done
                        ? colors.primary
                        : set.current
                          ? colors.text
                          : colors.border,
                    }}
                  />
                ))}
              </Row>
            </Column>
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
