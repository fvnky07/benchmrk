// PROTOTYPE — throwaway (prototype/workout-ui branch).
// Presentational pieces shared by the Group variants. Layout and drawing are
// React Native views coloured by `useColors()`; native controls (Switch,
// Invite button, rows from shared components) sit in small `Host` islands.
import { Button, Column, Host, Switch } from '@expo/ui';
import { Image } from 'expo-image';
import { type ReactNode, useState } from 'react';
import {
  type ColorValue,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextStyle,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { MemberActionsSheet } from '@/components/groups/member-actions-sheet';
import { useAppearance, useColors } from '@/lib/ui';
import { accessibilityModifier } from '@/lib/ui/accessibility';
import type {
  GroupActions,
  GroupMember,
  GroupMenuItem,
  GroupModel,
} from './model';

export const SCREEN_PADDING = 20;

export const TABULAR: NonNullable<TextStyle['fontVariant']> = ['tabular-nums'];

/** A native Host sized to its content, or to `width` when content wraps. */
export function NativeHost({
  children,
  width,
}: Readonly<{ children: ReactNode; width?: number }>) {
  const { resolvedAppearance } = useAppearance();
  return (
    <Host
      colorScheme={resolvedAppearance}
      matchContents={width === undefined ? true : { vertical: true }}
      style={width === undefined ? undefined : { width }}
    >
      {children}
    </Host>
  );
}

/** Shared Expo UI rows (inbox, errors) at the content width. */
export function NativeColumn({
  children,
  width,
}: Readonly<{ children: ReactNode; width: number }>) {
  return (
    <NativeHost width={width}>
      <Column spacing={12}>{children}</Column>
    </NativeHost>
  );
}

export function Avatar({
  member,
  size,
}: Readonly<{ member: GroupMember; size: number }>) {
  const colors = useColors();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.secondaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {member.image ? (
        <Image
          accessibilityLabel={`${member.username}'s photo`}
          source={{ uri: member.image }}
          style={{ width: size, height: size }}
        />
      ) : (
        <Text
          allowFontScaling={false}
          style={{
            color: colors.onSecondaryContainer,
            fontSize: size * 0.38,
            fontWeight: '700',
          }}
        >
          {member.username.slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

/** A slim rounded progress bar: planned Sets completed. */
export function Bar({
  fraction,
  height = 4,
  trackColor,
}: Readonly<{
  fraction: number;
  height?: number;
  trackColor?: ColorValue;
}>) {
  const colors = useColors();
  const percent = Math.round(fraction * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: trackColor ?? colors.surfaceContainerHighest,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          height,
          borderRadius: height / 2,
          width: `${percent}%`,
          backgroundColor: colors.primary,
        }}
      />
    </View>
  );
}

/** A circular progress ring with room for a centred label. */
export function Ring({
  fraction,
  size,
  strokeWidth,
  trackColor,
  children,
}: Readonly<{
  fraction: number;
  size: number;
  strokeWidth: number;
  trackColor: ColorValue;
  children?: ReactNode;
}>) {
  const colors = useColors();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.round(fraction * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {fraction > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.primary}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference * fraction} ${circumference}`}
            fill="none"
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

export function Chevron({
  color,
  size = 20,
}: Readonly<{ color: ColorValue; size?: number }>) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M15 5l-7 7 7 7"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function BackButton({
  label = 'Workout',
  onPress,
}: Readonly<{ label?: string; onPress: () => void }>) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityLabel="Back to your Workout"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: -6,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Chevron color={colors.primary} />
      <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '500' }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The native filled button, so Invite follows the platform's own style. */
export function InviteButton({ onPress }: Readonly<{ onPress: () => void }>) {
  return (
    <NativeHost>
      <Button label="Invite" onPress={onPress} />
    </NativeHost>
  );
}

export type ChipTone = 'default' | 'destructive' | 'primary';

export function Chip({
  label,
  onPress,
  disabled = false,
  tone = 'default',
}: Readonly<{
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: ChipTone;
}>) {
  const colors = useColors();
  const fill = {
    default: colors.surfaceContainerHigh,
    destructive: colors.errorContainer,
    primary: colors.primary,
  }[tone];
  const ink = {
    default: colors.onSurface,
    destructive: colors.onErrorContainer,
    primary: colors.onPrimary,
  }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 40,
        paddingHorizontal: 16,
        borderRadius: 20,
        justifyContent: 'center',
        backgroundColor: fill,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: ink, fontSize: 15, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** The one solid primary action of a screen, full width. */
export function PrimaryButton({
  label,
  onPress,
}: Readonly<{ label: string; onPress: () => void }>) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text
        style={{ color: colors.onPrimary, fontSize: 17, fontWeight: '700' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SectionTitle({
  children,
  trailing,
}: Readonly<{ children: string; trailing?: string }>) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ color: colors.onSurface, fontSize: 22, fontWeight: '700' }}
      >
        {children}
      </Text>
      {trailing ? (
        <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
          {trailing}
        </Text>
      ) : null}
    </View>
  );
}

/** Title block under the back/invite row. */
export function ScreenTitle({
  title,
  subtitle,
}: Readonly<{ title: string; subtitle: string }>) {
  const colors = useColors();
  return (
    <View style={{ gap: 2 }}>
      <Text
        accessibilityRole="header"
        style={{ color: colors.onSurface, fontSize: 28, fontWeight: '800' }}
      >
        {title}
      </Text>
      <Text style={{ color: colors.onSurfaceVariant, fontSize: 15 }}>
        {subtitle}
      </Text>
    </View>
  );
}

/** Rounded grouped block on `surfaceContainer`. */
export function Block({ children }: Readonly<{ children: ReactNode }>) {
  const colors = useColors();
  return (
    <View
      style={{
        backgroundColor: colors.surfaceContainer,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {children}
    </View>
  );
}

export function Hairline() {
  const colors = useColors();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.outlineVariant,
      }}
    />
  );
}

/** The show-weights switch: native Switch, custom row. */
export function WeightsRow({
  model,
  actions,
}: Readonly<{ model: GroupModel; actions: GroupActions }>) {
  const colors = useColors();
  const label = 'Show my weights, reps and volume';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: colors.onSurface, fontSize: 16 }}>{label}</Text>
        <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
          Hidden from the Group unless you turn this on
        </Text>
      </View>
      <NativeHost>
        <Switch
          disabled={model.busy}
          modifiers={[accessibilityModifier(label)]}
          value={model.showWeights}
          onValueChange={actions.onSetShowWeights}
        />
      </NativeHost>
    </View>
  );
}

/** Settings-style rows: weights switch, then every Group menu action. */
export function ActionList({
  model,
  actions,
  menu,
}: Readonly<{
  model: GroupModel;
  actions: GroupActions;
  menu: readonly GroupMenuItem[];
}>) {
  const colors = useColors();
  return (
    <Block>
      <WeightsRow model={model} actions={actions} />
      {menu.map((item) => (
        <View key={item.key}>
          <Hairline />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: item.disabled }}
            disabled={item.disabled}
            onPress={item.onPress}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 15,
              opacity: item.disabled ? 0.4 : pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                color: item.destructive ? colors.error : colors.onSurface,
                fontSize: 17,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        </View>
      ))}
    </Block>
  );
}

/** Pill chips for the Group menu, scrolling edge to edge. */
export function ActionChips({
  menu,
}: Readonly<{ menu: readonly GroupMenuItem[] }>) {
  return (
    <ScrollView
      contentContainerStyle={{ gap: 8, paddingHorizontal: SCREEN_PADDING }}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -SCREEN_PADDING, flexGrow: 0 }}
    >
      {menu.map((item) => (
        <Chip
          key={item.key}
          disabled={item.disabled}
          label={item.label}
          tone={item.destructive ? 'destructive' : 'default'}
          onPress={item.onPress}
        />
      ))}
    </ScrollView>
  );
}

/** Tapping another member opens their report/block/remove sheet. */
export function useMemberActions(member: GroupMember, isHost: boolean) {
  const [presented, setPresented] = useState(false);
  if (member.isYou) {
    return { open: undefined, sheet: null };
  }
  return {
    open: () => setPresented(true),
    sheet: (
      <MemberActionsSheet
        isHost={isHost}
        isPresented={presented}
        username={member.username}
        onDismiss={() => setPresented(false)}
      />
    ),
  };
}
