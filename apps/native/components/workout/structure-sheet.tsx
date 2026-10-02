import { BottomSheet, Button, Column, Row, ScrollView, Text } from '@expo/ui';

import { THEME, useAppearance } from '@/lib/ui';

export type StructureExercise = {
  key: string;
  name: string;
  skipped: boolean;
  /** Remove and Swap are only for Exercises with nothing logged. */
  hasLoggedSets: boolean;
};

type StructureSheetProps = {
  isPresented: boolean;
  exercises: readonly StructureExercise[];
  onMove: (key: string, toIndex: number) => void;
  onSetSkipped: (key: string, skipped: boolean) => void;
  onRemove: (key: string) => void;
  onDismiss: () => void;
};

/** Reorder, skip or remove this Workout's Exercises; the Routine is untouched. */
export function StructureSheet({
  isPresented,
  exercises,
  onMove,
  onSetSkipped,
  onRemove,
  onDismiss,
}: Readonly<StructureSheetProps>) {
  const { resolvedAppearance } = useAppearance();
  const colors = THEME[resolvedAppearance];

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
          <Text textStyle={{ fontSize: 14, color: colors.mutedForeground }}>
            Changes apply to this Workout only. At finish you can save them to
            the Routine.
          </Text>
          {exercises.map((exercise, index) => (
            <Column
              key={exercise.key}
              spacing={4}
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.muted,
              }}
            >
              <Text textStyle={{ fontSize: 17, fontWeight: '600' }}>
                {exercise.skipped
                  ? `${exercise.name} (skipped)`
                  : exercise.name}
              </Text>
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
                  onPress={() => onSetSkipped(exercise.key, !exercise.skipped)}
                />
                {exercise.hasLoggedSets ? null : (
                  <Button
                    label="Remove"
                    variant="text"
                    onPress={() => onRemove(exercise.key)}
                  />
                )}
              </Row>
            </Column>
          ))}
        </Column>
      </ScrollView>
    </BottomSheet>
  );
}
