// PROTOTYPE — throwaway (prototype/workout-ui branch).
// Shared presentational pieces for Active Workout variants B, C and D. Native
// @expo/ui controls (Button, Icon) in small Host islands, custom-drawn RN
// views for set rows, effort dots and the rest ring. Colours: useColors().
import CheckIcon from '@expo/material-symbols/check.xml';
import EditNoteIcon from '@expo/material-symbols/edit_note.xml';
import FormatListBulletedIcon from '@expo/material-symbols/format_list_bulleted.xml';
import KeepIcon from '@expo/material-symbols/keep.xml';
import MoreHorizIcon from '@expo/material-symbols/more_horiz.xml';
import TimerIcon from '@expo/material-symbols/timer.xml';
import { Button, Host, Icon, Text as NativeText } from '@expo/ui';
import {
  EFFORT_DOT_RPES,
  type EffortScale,
  effortInScale,
} from '@repo/backend/convex/domain/effort';
import type { ComponentProps, ReactNode } from 'react';
import {
  type ColorValue,
  Platform,
  Pressable,
  Text,
  type TextStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { type AppColors, useAppearance, useColors } from '@/lib/ui';
import { formatEffort } from '@/lib/workout/format';

/** Horizontal page inset. */
export const INSET = 20;

/** Tabular figures for weights, reps and clocks. */
export const TABULAR: TextStyle = { fontVariant: ['tabular-nums'] };

export function useContentWidth(): number {
  return useWindowDimensions().width - 2 * INSET;
}

export const GLYPHS = {
  timer: { ios: 'timer', android: TimerIcon },
  exercises: { ios: 'list.bullet', android: FormatListBulletedIcon },
  more: { ios: 'ellipsis', android: MoreHorizIcon },
  pin: { ios: 'pin.fill', android: KeepIcon },
  note: { ios: 'note.text', android: EditNoteIcon },
  check: { ios: 'checkmark', android: CheckIcon },
} as const satisfies Record<string, ComponentProps<typeof Icon>['name']>;

export type GlyphName = keyof typeof GLYPHS;

/** A native icon in its own fixed-size Host. */
export function Glyph({
  name,
  size = 22,
  color,
}: Readonly<{ name: GlyphName; size?: number; color: ColorValue }>) {
  const { resolvedAppearance } = useAppearance();
  return (
    <Host
      colorScheme={resolvedAppearance}
      style={{ width: size, height: size }}
    >
      <Icon name={GLYPHS[name]} size={size} color={color} />
    </Host>
  );
}

/** A Host that sizes itself to native content, for existing @expo/ui parts. */
export function NativeIsland({
  children,
  width,
}: Readonly<{ children: ReactNode; width?: number }>) {
  const { resolvedAppearance } = useAppearance();
  const contentWidth = useContentWidth();
  return (
    <Host
      colorScheme={resolvedAppearance}
      matchContents={{ vertical: true }}
      style={{ width: width ?? contentWidth }}
    >
      {children}
    </Host>
  );
}

const BUTTON_PADDING = Platform.OS === 'ios' ? 32 : 48;

/**
 * The one primary action: a native filled Button, stretched to the width by
 * sizing its label (SwiftUI and Compose both size a button to its label).
 */
export function PrimaryButton({
  label,
  onPress,
  width,
  labelHeight = 40,
}: Readonly<{
  label: string;
  onPress: () => void;
  width?: number;
  labelHeight?: number;
}>) {
  const contentWidth = useContentWidth();
  const buttonWidth = width ?? contentWidth;
  return (
    <NativeIsland width={buttonWidth}>
      <Button onPress={onPress}>
        <NativeText
          style={{ width: buttonWidth - BUTTON_PADDING, height: labelHeight }}
          textStyle={{ fontSize: 18, fontWeight: '700', textAlign: 'center' }}
        >
          {label}
        </NativeText>
      </Button>
    </NativeIsland>
  );
}

export type Tone = 'neutral' | 'primary' | 'error' | 'inverse';

function toneColors(colors: AppColors, tone: Tone) {
  switch (tone) {
    case 'primary':
      return {
        fill: colors.primaryContainer,
        on: colors.onPrimaryContainer,
      };
    case 'error':
      return { fill: colors.errorContainer, on: colors.onErrorContainer };
    case 'inverse':
      return { fill: colors.inverseSurface, on: colors.inverseOnSurface };
    case 'neutral':
      return { fill: colors.surfaceContainerHigh, on: colors.onSurface };
  }
}

/** A pill: the MacroFactor action chip. */
export function Chip({
  label,
  onPress,
  tone = 'neutral',
  size = 'regular',
}: Readonly<{
  label: string;
  onPress: () => void;
  tone?: Tone;
  size?: 'regular' | 'small';
}>) {
  const colors = useColors();
  const { fill, on } = toneColors(colors, tone);
  const small = size === 'small';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        height: small ? 28 : 36,
        paddingHorizontal: small ? 12 : 16,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: fill,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text
        style={{
          color: on,
          fontSize: small ? 13 : 15,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A round 40pt button holding a native icon. */
export function IconButton({
  glyph,
  label,
  onPress,
}: Readonly<{ glyph: GlyphName; label: string; onPress: () => void }>) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceContainerHigh,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Glyph name={glyph} size={20} color={colors.onSurface} />
    </Pressable>
  );
}

/** A circular progress ring that drains or fills; children sit in its middle. */
export function ProgressRing({
  fraction,
  size,
  thickness,
  color,
  track,
  children,
}: Readonly<{
  fraction: number;
  size: number;
  thickness: number;
  color: ColorValue;
  track: ColorValue;
  children?: ReactNode;
}>) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const shown = Math.min(1, Math.max(0, fraction));
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={track}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={[circumference, circumference]}
          strokeDashoffset={circumference * (1 - shown)}
          rotation={-90}
          originX={center}
          originY={center}
          fill="none"
        />
      </Svg>
      {children}
    </View>
  );
}

/** Effort bands, hardest first: error, tertiary, primary, secondary. */
export function effortTone(rpe: number, colors: AppColors) {
  if (rpe >= 9.5) return { fill: colors.error, on: colors.onError };
  if (rpe >= 8.5) return { fill: colors.tertiary, on: colors.onTertiary };
  if (rpe >= 7.5) return { fill: colors.primary, on: colors.onPrimary };
  return { fill: colors.secondary, on: colors.onSecondary };
}

/** The effort dots: tap one to rate the Set, tap it again to clear. */
export function EffortDots({
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
        return (
          <Pressable
            key={dot}
            accessibilityLabel={`${scale} ${formatEffort(effortInScale(dot, scale))}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onRate(selected ? null : dot)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
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
              {formatEffort(effortInScale(dot, scale))}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
