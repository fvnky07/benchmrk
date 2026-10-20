import { RNHostView } from '@expo/ui';
import {
  EFFORT_DOT_RPES,
  type EffortScale,
  effortInScale,
} from '@repo/backend/convex/domain/effort';
import {
  type ColorValue,
  Pressable,
  Text,
  type TextStyle,
  View,
} from 'react-native';

import { pillColors } from '@/components/native/pill-chip';
import { type AppColors, font, radius, size, space, useColors } from '@/lib/ui';
import { formatEffort } from '@/lib/workout/format';
import type { KeypadKey, SetField } from '@/lib/workout/set-entry';

const KEY_ROWS: readonly (readonly KeypadKey[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'back'],
];

const KEY_GAP = space.sm;
const KEY_RADIUS = 12;
const DOT_SIZE = 36;
const SMALL_CHIP_HEIGHT = 28;
/** Grows a small chip's target to the 44pt/48dp minimum. */
const SMALL_CHIP_SLOP = { top: 10, bottom: 10, left: 4, right: 4 };

/** Tabular figures, so weights, reps, effort and clocks line up. */
export const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };

/** Effort bands, hardest first: error, tertiary, primary, secondary. */
export function effortTone(
  rpe: number,
  colors: AppColors
): { fill: ColorValue; on: ColorValue } {
  if (rpe >= 9.5) return { fill: colors.error, on: colors.onError };
  if (rpe >= 8.5) return { fill: colors.tertiary, on: colors.onTertiary };
  if (rpe >= 7.5) return { fill: colors.primary, on: colors.onPrimary };
  return { fill: colors.secondary, on: colors.onSecondary };
}

/** A 28pt pill inside the React Native hero pieces: the Set rows and this keypad. */
export function SmallChip({
  label,
  accessibilityLabel,
  tone = 'neutral',
  onPress,
}: Readonly<{
  label: string;
  /** Defaults to `label`. */
  accessibilityLabel?: string;
  tone?: 'neutral' | 'error';
  onPress: () => void;
}>) {
  const { fill, on } = pillColors(useColors(), { tone });

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      hitSlop={SMALL_CHIP_SLOP}
      onPress={onPress}
      style={({ pressed }) => ({
        height: SMALL_CHIP_HEIGHT,
        paddingHorizontal: space.md,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: fill,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: on, fontSize: 13, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** One filled key; the confirm key is solid primary. */
function Key({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  grow = false,
  height = size.key,
  confirm = false,
}: Readonly<{
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  /** Shares its row's width with the other keys. */
  grow?: boolean;
  height?: number;
  confirm?: boolean;
}>) {
  const colors = useColors();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: grow ? 1 : undefined,
        height,
        borderRadius: KEY_RADIUS,
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
            : { color: colors.onSurface, ...font.key },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** The effort dots: tap one to rate the Set, tap it again to clear. */
function EffortDots({
  rpe,
  scale,
  onRate,
}: Readonly<{
  rpe: number | null;
  scale: EffortScale;
  onRate: (rpe: number | null) => void;
}>) {
  const colors = useColors();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      {EFFORT_DOT_RPES.map((dot) => {
        const selected = rpe === dot;
        const tone = effortTone(dot, colors);
        const value = formatEffort(effortInScale(dot, scale));
        return (
          <Pressable
            key={dot}
            accessibilityLabel={`${scale} ${value}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onRate(selected ? null : dot)}
            style={{
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
              borderWidth: 2,
              borderColor: tone.fill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? tone.fill : 'transparent',
            }}
          >
            <Text
              style={[
                TABULAR,
                {
                  color: selected ? tone.on : colors.onSurface,
                  fontSize: 14,
                  fontWeight: '700',
                },
              ]}
            >
              {value}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type SetKeypadProps = {
  /** The dock's inner width; the keys share it. */
  width: number;
  /** "Set 2 · Weight": what the keys are typing into. */
  target: string;
  field: SetField;
  effortScale: EffortScale;
  rpe: number | null;
  isFailure: boolean;
  /** The per-side plate breakdown while a barbell weight is typed; null otherwise. */
  plateStrip: string | null;
  onOpenPlates: () => void;
  onKey: (key: KeypadKey) => void;
  onStep: (direction: 1 | -1) => void;
  onRate: (rpe: number | null) => void;
  onToggleScale: () => void;
  onToggleFailure: () => void;
  onLog: () => void;
  onHide: () => void;
};

/**
 * The docked keypad: filled keys, effort dots and a tall primary key that
 * logs the Set. Neither system number pad can carry the effort row, the scale
 * or the normal/failure toggle, so it's a React Native hero piece.
 */
export function SetKeypad({
  width,
  target,
  field,
  effortScale,
  rpe,
  isFailure,
  plateStrip,
  onOpenPlates,
  onKey,
  onStep,
  onRate,
  onToggleScale,
  onToggleFailure,
  onLog,
  onHide,
}: Readonly<SetKeypadProps>) {
  const colors = useColors();
  const takesDecimal = field === 'weight' || field === 'distance';

  return (
    <RNHostView matchContents>
      <View style={{ width, gap: KEY_GAP }}>
        {plateStrip === null ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={onOpenPlates}
            style={{
              padding: 10,
              borderRadius: radius.control,
              backgroundColor: colors.surfaceContainerHigh,
            }}
          >
            <Text style={[TABULAR, { color: colors.onSurface, fontSize: 14 }]}>
              {plateStrip}
            </Text>
          </Pressable>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            numberOfLines={1}
            style={{ flex: 1, color: colors.onSurfaceVariant, ...font.label }}
          >
            {target}
          </Text>
          <SmallChip
            label={isFailure ? 'Failure' : 'Normal'}
            tone={isFailure ? 'error' : 'neutral'}
            onPress={onToggleFailure}
          />
          <SmallChip label={effortScale} onPress={onToggleScale} />
          <SmallChip
            label="Hide"
            accessibilityLabel="Hide keypad"
            onPress={onHide}
          />
        </View>
        <EffortDots rpe={rpe} scale={effortScale} onRate={onRate} />
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
                    onPress={() => onKey(key)}
                  />
                ))}
              </View>
            ))}
          </View>
          <View style={{ flex: 1, gap: KEY_GAP }}>
            <Key
              label="−"
              accessibilityLabel="Decrease"
              onPress={() => onStep(-1)}
            />
            <Key
              label="+"
              accessibilityLabel="Increase"
              onPress={() => onStep(1)}
            />
            <Key
              confirm
              label="Log Set"
              height={2 * size.key + KEY_GAP}
              onPress={onLog}
            />
          </View>
        </View>
      </View>
    </RNHostView>
  );
}
