// PROTOTYPE — throwaway (prototype/workout-ui branch).
// The docked keypad in the MacroFactor look: filled keys, effort dots, a tall
// solid primary confirm key. Same inputs and handlers as the shared SetKeypad.
import { Pressable, Text, View } from 'react-native';

import { useColors } from '@/lib/ui';
import type { KeypadKey } from '@/lib/workout/set-entry';
import type { ActiveActions, ActiveModel } from './model';
import { Chip, EffortDots, TABULAR } from './parts';

const KEY_ROWS: readonly (readonly KeypadKey[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'back'],
];

const KEY_HEIGHT = 48;
const KEY_GAP = 8;

function Key({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  grow = false,
  height = KEY_HEIGHT,
  confirm = false,
}: Readonly<{
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  grow?: boolean;
  height?: number;
  confirm?: boolean;
}>) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: grow ? 1 : undefined,
        height,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: confirm ? colors.primary : colors.surfaceContainerHigh,
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <Text
        style={[
          TABULAR,
          confirm
            ? { color: colors.onPrimary, fontSize: 17, fontWeight: '700' }
            : { color: colors.onSurface, fontSize: 22, fontWeight: '500' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Types into `model.focus`; render it inside a `Dock`. Null without a focus. */
export function ModelKeypad({
  model,
  actions,
  confirmLabel = 'Log set',
}: Readonly<{
  model: ActiveModel;
  actions: ActiveActions;
  confirmLabel?: string;
}>) {
  const colors = useColors();
  const { focus, focusSet } = model;
  if (!focus || !focusSet) return null;
  const takesDecimal = focus.field === 'weight' || focus.field === 'distance';
  const isFailure = focusSet.type === 'failure';

  return (
    <View style={{ gap: 8 }}>
      {model.plateStrip === null ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={actions.openPlates}
          style={{
            padding: 10,
            borderRadius: 10,
            backgroundColor: colors.surfaceContainerHigh,
          }}
        >
          <Text style={{ color: colors.onSurface, fontSize: 14 }}>
            {model.plateStrip}
          </Text>
        </Pressable>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: colors.onSurfaceVariant,
            fontSize: 14,
            fontWeight: '600',
          }}
        >
          {model.keypadTarget}
        </Text>
        <Chip
          size="small"
          label={isFailure ? 'Failure' : 'Normal'}
          tone={isFailure ? 'error' : 'neutral'}
          onPress={actions.toggleFailure}
        />
        <Chip
          size="small"
          label={model.effortScale}
          onPress={actions.toggleScale}
        />
        <Chip size="small" label="Hide" onPress={actions.hideKeypad} />
      </View>
      <EffortDots
        rpe={focusSet.rpe}
        scale={model.effortScale}
        onRate={actions.rate}
      />
      <View style={{ flexDirection: 'row', gap: KEY_GAP }}>
        <View style={{ flex: 3, gap: KEY_GAP }}>
          {KEY_ROWS.map((keys) => (
            <View
              key={keys.join('')}
              style={{ flexDirection: 'row', gap: KEY_GAP }}
            >
              {keys.map((key) => (
                <Key
                  key={key}
                  grow
                  label={key === 'back' ? '⌫' : key}
                  accessibilityLabel={key === 'back' ? 'Delete' : key}
                  disabled={key === '.' && !takesDecimal}
                  onPress={() => actions.pressKey(key)}
                />
              ))}
            </View>
          ))}
        </View>
        <View style={{ flex: 1, gap: KEY_GAP }}>
          <Key
            label="−"
            accessibilityLabel="Decrease"
            onPress={() => actions.step(-1)}
          />
          <Key
            label="+"
            accessibilityLabel="Increase"
            onPress={() => actions.step(1)}
          />
          <Key
            confirm
            label={confirmLabel}
            height={2 * KEY_HEIGHT + KEY_GAP}
            onPress={actions.logFocused}
          />
        </View>
      </View>
    </View>
  );
}
