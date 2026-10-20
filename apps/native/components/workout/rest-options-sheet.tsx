import { BottomSheet, Column, Row, Text } from '@expo/ui';

import { Card } from '@/components/native/card';
import { PillChip } from '@/components/native/pill-chip';
import { PrimaryButton } from '@/components/native/primary-button';
import { SectionHeader } from '@/components/native/section-header';
import { font, space, tabularDigits, textColor, useColors } from '@/lib/ui';
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
  const colors = useColors();
  const muted = { ...font.caption, color: textColor(colors.onSurfaceVariant) };

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      showDragIndicator
      snapPoints={['half']}
    >
      <Column
        spacing={space.lg}
        style={{ paddingHorizontal: space.screen, paddingVertical: space.lg }}
      >
        <SectionHeader title="Rest" />
        {isResting ? (
          <Column spacing={space.md}>
            <Row spacing={space.sm}>
              <PillChip label="−15 s" onPress={() => onAdjust(-STEP_SECONDS)} />
              <PillChip label="+15 s" onPress={() => onAdjust(STEP_SECONDS)} />
            </Row>
            <PrimaryButton label="Skip rest" onPress={onSkip} />
          </Column>
        ) : (
          <Card padding={space.lg}>
            <Text textStyle={muted}>
              Not resting. Rest starts when you log a Set.
            </Text>
          </Card>
        )}
        <Card padding={space.lg} spacing={space.md}>
          <Column spacing={2}>
            <Text textStyle={muted}>Default rest for</Text>
            <Text
              textStyle={{
                ...font.bodyStrong,
                color: textColor(colors.onSurface),
              }}
            >
              {exerciseName}
            </Text>
          </Column>
          <Row alignment="center" spacing={space.md}>
            <PillChip
              label="−"
              disabled={defaultSeconds < STEP_SECONDS}
              onPress={() => onSetDefault(defaultSeconds - STEP_SECONDS)}
            />
            <Text
              textStyle={{
                ...font.section,
                color: textColor(colors.onSurface),
              }}
              modifiers={tabularDigits()}
            >
              {formatClock(defaultSeconds)}
            </Text>
            <PillChip
              label="+"
              onPress={() => onSetDefault(defaultSeconds + STEP_SECONDS)}
            />
          </Row>
        </Card>
      </Column>
    </BottomSheet>
  );
}
