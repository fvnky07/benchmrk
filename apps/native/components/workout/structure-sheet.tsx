import { BottomSheet, Button, Column, Row, ScrollView, Text } from '@expo/ui';

import { textColor, useColors } from '@/lib/ui';

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
        <Column spacing={12} style={{ padding: 16 }}>
          <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>Exercises</Text>
          <Text
            textStyle={{
              fontSize: 14,
              color: textColor(colors.onSurfaceVariant),
            }}
          >
            Changes apply to this Workout only. At finish you can save them to
            the Routine.
          </Text>
          {exercises.map((exercise, index) => {
            const next = exercises[index + 1];
            const linkedToNext =
              exercise.blockKey !== null &&
              next?.blockKey === exercise.blockKey;
            return (
              <Column
                key={exercise.key}
                spacing={4}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.surfaceContainerHigh,
                }}
              >
                <Text textStyle={{ fontSize: 17, fontWeight: '600' }}>
                  {exercise.skipped
                    ? `${exercise.name} (skipped)`
                    : exercise.name}
                </Text>
                {linkedToNext ? (
                  <Text textStyle={{ fontSize: 13 }}>
                    {`Alternates with ${next.name}`}
                  </Text>
                ) : null}
                <Row spacing={4}>
                  <Button
                    label="Up"
                    variant="text"
                    disabled={index === 0}
                    onPress={() => onMove(exercise.key, index - 1)}
                  />
                  <Button
                    label="Down"
                    variant="text"
                    disabled={index === exercises.length - 1}
                    onPress={() => onMove(exercise.key, index + 1)}
                  />
                  <Button
                    label={exercise.skipped ? 'Resume' : 'Skip'}
                    variant="text"
                    onPress={() =>
                      onSetSkipped(exercise.key, !exercise.skipped)
                    }
                  />
                  {exercise.hasLoggedSets ? null : (
                    <Button
                      label="Remove"
                      variant="text"
                      onPress={() => onRemove(exercise.key)}
                    />
                  )}
                </Row>
                <Row spacing={4}>
                  {exercise.blockKey !== null ? (
                    <Button
                      label="Unlink"
                      variant="text"
                      onPress={() => onUnlink(exercise.key)}
                    />
                  ) : null}
                  {next && !linkedToNext ? (
                    <Button
                      label={`Link with ${next.name}`}
                      variant="text"
                      onPress={() => onLink(exercise.key, next.key)}
                    />
                  ) : null}
                </Row>
              </Column>
            );
          })}
        </Column>
      </ScrollView>
    </BottomSheet>
  );
}
