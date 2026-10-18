import { BottomSheet, Column, Row, ScrollView, Text } from '@expo/ui';

import { Card } from '@/components/native/card';
import { PillChip } from '@/components/native/pill-chip';
import { SectionHeader } from '@/components/native/section-header';
import { font, space, textColor, useColors } from '@/lib/ui';

export type StructureExercise = {
  key: string;
  name: string;
  skipped: boolean;
  /** Remove and Swap are only for Exercises with nothing logged. */
  hasLoggedSets: boolean;
  /** Its Alternating sets block in this Workout. */
  blockKey: string | null;
};

type StructureSheetProps = {
  isPresented: boolean;
  exercises: readonly StructureExercise[];
  onMove: (key: string, toIndex: number) => void;
  onSetSkipped: (key: string, skipped: boolean) => void;
  onRemove: (key: string) => void;
  /** Links the next Exercise into this one's Alternating sets. */
  onLink: (key: string, nextKey: string) => void;
  onUnlink: (key: string) => void;
  onDismiss: () => void;
};

/**
 * Reorder, skip, remove, link or unlink this Workout's Exercises; the Routine
 * is untouched. Linked Exercises alternate one Set at a time.
 */
export function StructureSheet({
  isPresented,
  exercises,
  onMove,
  onSetSkipped,
  onRemove,
  onLink,
  onUnlink,
  onDismiss,
}: Readonly<StructureSheetProps>) {
  const colors = useColors();

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      showDragIndicator
      snapPoints={['full']}
    >
      <ScrollView>
        <Column
          spacing={space.lg}
          style={{ paddingHorizontal: space.screen, paddingVertical: space.lg }}
        >
          <SectionHeader
            title="Exercises"
            supportingText="Changes apply to this Workout only. At finish you can save them to the Routine."
          />
          <Card divided>
            {exercises.map((exercise, index) => {
              const next = exercises[index + 1];
              const linkedToNext =
                exercise.blockKey !== null &&
                next?.blockKey === exercise.blockKey;
              const canLink = next !== undefined && !linkedToNext;
              return (
                <Column
                  key={exercise.key}
                  spacing={space.md}
                  style={{ padding: space.lg }}
                >
                  <Column spacing={2}>
                    <Text
                      textStyle={{
                        ...font.bodyStrong,
                        color: textColor(colors.onSurface),
                      }}
                    >
                      {exercise.skipped
                        ? `${exercise.name} (skipped)`
                        : exercise.name}
                    </Text>
                    {linkedToNext ? (
                      <Text
                        textStyle={{
                          ...font.caption,
                          color: textColor(colors.onSurfaceVariant),
                        }}
                      >
                        {`Alternates with ${next.name}`}
                      </Text>
                    ) : null}
                  </Column>
                  <ScrollView direction="horizontal" showsIndicators={false}>
                    <Row spacing={space.sm}>
                      <PillChip
                        label="Up"
                        disabled={index === 0}
                        onPress={() => onMove(exercise.key, index - 1)}
                      />
                      <PillChip
                        label="Down"
                        disabled={index === exercises.length - 1}
                        onPress={() => onMove(exercise.key, index + 1)}
                      />
                      <PillChip
                        label={exercise.skipped ? 'Resume' : 'Skip'}
                        onPress={() =>
                          onSetSkipped(exercise.key, !exercise.skipped)
                        }
                      />
                      {exercise.hasLoggedSets ? null : (
                        <PillChip
                          label="Remove"
                          tone="error"
                          onPress={() => onRemove(exercise.key)}
                        />
                      )}
                    </Row>
                  </ScrollView>
                  {exercise.blockKey !== null || canLink ? (
                    <ScrollView direction="horizontal" showsIndicators={false}>
                      <Row spacing={space.sm}>
                        {exercise.blockKey !== null ? (
                          <PillChip
                            label="Unlink"
                            onPress={() => onUnlink(exercise.key)}
                          />
                        ) : null}
                        {canLink ? (
                          <PillChip
                            label={`Link with ${next.name}`}
                            onPress={() => onLink(exercise.key, next.key)}
                          />
                        ) : null}
                      </Row>
                    </ScrollView>
                  ) : null}
                </Column>
              );
            })}
          </Card>
        </Column>
      </ScrollView>
    </BottomSheet>
  );
}
