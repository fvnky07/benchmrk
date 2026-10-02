import { Button, Column, Row, ScrollView, Spacer, Text } from '@expo/ui';
import {
  EFFORT_DOT_RPES,
  type EffortScale,
  effortInScale,
} from '@repo/backend/convex/domain/effort';

import { THEME, useAppearance } from '@/lib/ui';
import { formatEffort } from '@/lib/workout/format';
import type { KeypadKey, SetField } from '@/lib/workout/set-entry';

const KEY_ROWS: readonly (readonly KeypadKey[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'back'],
];

const KEY_SIZE = { width: 76, height: 48 };

/** Effort colour bands: hard red, near-limit amber, solid green, easy blue. */
function effortColor(rpe: number): string {
  if (rpe >= 9.5) return '#d33a32';
  if (rpe >= 8.5) return '#d97706';
  if (rpe >= 7.5) return '#2e9e4f';
  return '#2a6fd6';
}

type SetKeypadProps = {
  /** "Set 2 · Weight (kg)": what the keys are typing into. */
  target: string;
  field: SetField;
  effortScale: EffortScale;
  rpe: number | null;
  isFailure: boolean;
  onKey: (key: KeypadKey) => void;
  onStep: (direction: 1 | -1) => void;
  onRate: (rpe: number | null) => void;
  onToggleScale: () => void;
  onToggleFailure: () => void;
  onLog: () => void;
  onHide: () => void;
};

/**
 * The docked keypad. Neither system number pad can carry the effort row, the
 * scale key or the normal/failure toggle, so it's built from Expo UI parts on
 * both platforms.
 */
export function SetKeypad({
  target,
  field,
  effortScale,
  rpe,
  isFailure,
  onKey,
  onStep,
  onRate,
  onToggleScale,
  onToggleFailure,
  onLog,
  onHide,
}: Readonly<SetKeypadProps>) {
  const { resolvedAppearance } = useAppearance();
  const colors = THEME[resolvedAppearance];
  const takesDecimal = field === 'weight' || field === 'distance';

  return (
    <Column
      spacing={10}
      style={{ padding: 12, borderRadius: 16, backgroundColor: colors.muted }}
    >
      <Row spacing={8} alignment="center">
        <Text textStyle={{ fontSize: 14, fontWeight: '600' }}>{target}</Text>
        <Spacer />
        <Button label="Hide keypad" variant="text" onPress={onHide} />
      </Row>
      <ScrollView direction="horizontal" showsIndicators={false}>
        <Row spacing={6}>
          {EFFORT_DOT_RPES.map((dot) => {
            const selected = rpe === dot;
            return (
              <Column
                key={dot}
                alignment="center"
                onPress={() => onRate(selected ? null : dot)}
                style={{
                  width: 44,
                  paddingVertical: 8,
                  borderRadius: 22,
                  borderWidth: 2,
                  borderColor: effortColor(dot),
                  backgroundColor: selected ? effortColor(dot) : undefined,
                }}
              >
                <Text
                  textStyle={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: selected ? '#ffffff' : undefined,
                  }}
                >
                  {formatEffort(effortInScale(dot, effortScale))}
                </Text>
              </Column>
            );
          })}
        </Row>
      </ScrollView>
      <Row spacing={8}>
        <Column spacing={8}>
          {KEY_ROWS.map((keys) => (
            <Row key={keys.join('')} spacing={8}>
              {keys.map((key) => (
                <Button
                  key={key}
                  disabled={key === '.' && !takesDecimal}
                  label={key === 'back' ? '⌫' : key}
                  variant="outlined"
                  style={KEY_SIZE}
                  onPress={() => onKey(key)}
                />
              ))}
            </Row>
          ))}
        </Column>
        <Column spacing={8}>
          <Button
            label="−"
            variant="outlined"
            style={KEY_SIZE}
            onPress={() => onStep(-1)}
          />
          <Button
            label="+"
            variant="outlined"
            style={KEY_SIZE}
            onPress={() => onStep(1)}
          />
          <Button
            label={isFailure ? 'Failure' : 'Normal'}
            variant={isFailure ? 'filled' : 'outlined'}
            style={KEY_SIZE}
            onPress={onToggleFailure}
          />
          <Button
            label={effortScale}
            variant="outlined"
            style={KEY_SIZE}
            onPress={onToggleScale}
          />
        </Column>
      </Row>
      <Button label="Log Set" onPress={onLog} />
    </Column>
  );
}
