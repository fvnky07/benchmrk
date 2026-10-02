import { BottomSheet, Button, Column, Row, Spacer, Text } from '@expo/ui';

import { formatClock } from '@/lib/workout/format';

const STEP_SECONDS = 15;

type RestOptionsSheetProps = {
  isPresented: boolean;
  isResting: boolean;
  exerciseName: string;
  /** This Exercise's default rest in this Workout. */
  defaultSeconds: number;
  onAdjust: (seconds: number) => void;
  onSkip: () => void;
  onSetDefault: (seconds: number) => void;
  onDismiss: () => void;
};

/** The discoverable path to every rest gesture, plus the per-Exercise default. */
export function RestOptionsSheet({
  isPresented,
  isResting,
  exerciseName,
  defaultSeconds,
  onAdjust,
  onSkip,
  onSetDefault,
  onDismiss,
}: Readonly<RestOptionsSheetProps>) {
  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      showDragIndicator
      snapPoints={['half']}
    >
      <Column spacing={16} style={{ padding: 16 }}>
        <Text textStyle={{ fontSize: 20, fontWeight: '700' }}>Rest</Text>
        {isResting ? (
          <Row spacing={8}>
            <Button
              label="−15 s"
              variant="outlined"
              onPress={() => onAdjust(-STEP_SECONDS)}
            />
            <Button
              label="+15 s"
              variant="outlined"
              onPress={() => onAdjust(STEP_SECONDS)}
            />
            <Spacer />
            <Button label="Skip rest" onPress={onSkip} />
          </Row>
        ) : (
          <Text textStyle={{ fontSize: 15 }}>
            Not resting. Rest starts when you log a Set.
          </Text>
        )}
        <Row spacing={8} alignment="center">
          <Column spacing={2}>
            <Text textStyle={{ fontSize: 15 }}>Default rest for</Text>
            <Text textStyle={{ fontSize: 15, fontWeight: '700' }}>
              {exerciseName}
            </Text>
          </Column>
          <Spacer />
          <Button
            label="−"
            variant="outlined"
            disabled={defaultSeconds < STEP_SECONDS}
            onPress={() => onSetDefault(defaultSeconds - STEP_SECONDS)}
          />
          <Text textStyle={{ fontSize: 17, fontWeight: '600' }}>
            {formatClock(defaultSeconds)}
          </Text>
          <Button
            label="+"
            variant="outlined"
            onPress={() => onSetDefault(defaultSeconds + STEP_SECONDS)}
          />
        </Row>
      </Column>
    </BottomSheet>
  );
}
