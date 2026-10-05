// PROTOTYPE — throwaway (prototype/workout-ui branch).
// Screen scaffold and chrome shared by Active Workout variants B, C and D:
// page, docked bottom panel, top bar, rest pill and status banners.
import { type ReactNode, type Ref, useEffect, useRef, useState } from 'react';
import {
  type ColorValue,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useHaptics } from '@/lib/haptics';
import { useColors } from '@/lib/ui';
import { formatClock } from '@/lib/workout/format';
import type { ActiveActions, ActiveModel } from './model';
import { Chip, Glyph, IconButton, INSET, TABULAR } from './parts';

export type RestView = Readonly<{
  isResting: boolean;
  isOver: boolean;
  /** Remaining share of the rest, 1 → 0. */
  fraction: number;
  /** m:ss left, or the planned rest while idle. */
  clock: string;
  /** primary; error and tertiary alternate in the last 10 seconds. */
  tone: ColorValue;
}>;

/** The rest countdown, derived once per variant (it plays the rest-over haptic). */
export function useRest(model: ActiveModel): RestView {
  const colors = useColors();
  const haptic = useHaptics();
  const { workout, now, plannedRestSeconds } = model;
  const rest = workout.rest;
  const remaining = rest ? Math.max(0, (rest.endsAt - now) / 1000) : null;
  const isResting = remaining !== null && remaining > 0;
  const isOver = remaining === 0;
  const wasResting = useRef(false);

  useEffect(() => {
    if (wasResting.current && isOver) haptic('rest-ended');
    wasResting.current = isResting;
  }, [haptic, isOver, isResting]);

  const total = rest ? rest.plannedSeconds + rest.adjustedSeconds : 0;
  // The last 10 seconds pulse between error and tertiary.
  const tone =
    remaining !== null && remaining > 0 && remaining <= 10
      ? Math.floor(remaining) % 2 === 0
        ? colors.error
        : colors.tertiary
      : colors.primary;
  return {
    isResting,
    isOver,
    fraction: total > 0 && remaining !== null ? remaining / total : 0,
    clock: formatClock(Math.ceil(remaining ?? plannedRestSeconds)),
    tone,
  };
}

/** The page: background, an optional fixed header, scrolling content, a dock. */
export function ProtoScreen({
  header,
  children,
  dock,
  floating,
  scrollRef,
}: Readonly<{
  header?: ReactNode;
  children: ReactNode;
  /** Pinned to the bottom, e.g. the keypad. */
  dock?: ReactNode;
  /** Floats just above the dock (or the bottom edge), centred. */
  floating?: ReactNode;
  scrollRef?: Ref<ScrollView>;
}>) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [dockHeight, setDockHeight] = useState(0);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: INSET,
          paddingTop: 8,
          paddingBottom: (dock ? 16 : insets.bottom + 24) + (floating ? 56 : 0),
          gap: 16,
        }}
      >
        {children}
      </ScrollView>
      {floating ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: (dock ? dockHeight : insets.bottom) + 12,
            alignItems: 'center',
          }}
        >
          {floating}
        </View>
      ) : null}
      {dock ? (
        <View
          onLayout={(event) => setDockHeight(event.nativeEvent.layout.height)}
        >
          {dock}
        </View>
      ) : null}
    </View>
  );
}

/** The docked bottom panel: a rounded container surface. */
export function Dock({ children }: Readonly<{ children: ReactNode }>) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: colors.surfaceContainer,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 12,
        paddingBottom: Math.max(insets.bottom, 12),
        gap: 8,
      }}
    >
      {children}
    </View>
  );
}

/** Stopwatch icon and m:ss: tap for rest options, hold to restart. */
export function RestPill({
  rest,
  onPress,
  onLongPress,
}: Readonly<{
  rest: RestView;
  onPress: () => void;
  onLongPress: () => void;
}>) {
  const colors = useColors();
  const label = rest.isOver ? 'Rest over' : rest.clock;
  const fill = rest.isOver ? colors.primary : colors.surfaceContainerHigh;
  const ink = rest.isOver
    ? colors.onPrimary
    : rest.isResting
      ? rest.tone
      : colors.onSurfaceVariant;
  return (
    <Pressable
      accessibilityLabel={
        rest.isResting
          ? `Rest, ${rest.clock} left`
          : rest.isOver
            ? 'Rest over'
            : `Planned rest ${rest.clock}`
      }
      accessibilityRole="button"
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 40,
        paddingHorizontal: 12,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: fill,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Glyph name="timer" size={18} color={ink} />
      <Text style={[TABULAR, { color: ink, fontSize: 15, fontWeight: '700' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Compact top bar: elapsed time left; rest, Exercises and menu right. */
export function TopBar({
  model,
  actions,
  rest,
}: Readonly<{
  model: ActiveModel;
  actions: ActiveActions;
  rest: RestView;
}>) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: INSET,
        paddingTop: 8,
        paddingBottom: 4,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={[
            TABULAR,
            { color: colors.onSurface, fontSize: 22, fontWeight: '700' },
          ]}
        >
          {formatClock(model.elapsedSeconds)}
        </Text>
        <Text
          numberOfLines={1}
          style={{ color: colors.onSurfaceVariant, fontSize: 13 }}
        >
          {model.workout.name}
        </Text>
      </View>
      <RestPill
        rest={rest}
        onPress={actions.openRestOptions}
        onLongPress={actions.resetRest}
      />
      <IconButton
        glyph="exercises"
        label="Exercises"
        onPress={actions.openStructure}
      />
      <IconButton
        glyph="more"
        label="Workout menu"
        onPress={actions.openMenu}
      />
    </View>
  );
}

/** Idle, terminate-confirmation and error notices; null when none apply. */
export function StatusBanners({
  model,
  actions,
}: Readonly<{ model: ActiveModel; actions: ActiveActions }>) {
  const colors = useColors();
  const { workout } = model;
  if (!(model.isIdle || model.isConfirmingTerminate || model.errorMessage)) {
    return null;
  }
  return (
    <View style={{ gap: 8 }}>
      {model.isIdle ? (
        <View
          style={{
            gap: 12,
            padding: 16,
            borderRadius: 16,
            backgroundColor: colors.secondaryContainer,
          }}
        >
          <View style={{ gap: 2 }}>
            <Text
              style={{
                color: colors.onSecondaryContainer,
                fontSize: 17,
                fontWeight: '700',
              }}
            >
              Still working out?
            </Text>
            <Text style={{ color: colors.onSecondaryContainer, fontSize: 15 }}>
              Nothing has happened for 20 minutes.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip
              label="Finish Workout"
              tone="inverse"
              onPress={actions.finishNow}
            />
            <Chip label="Keep going" onPress={actions.keepGoing} />
          </View>
        </View>
      ) : null}
      {model.isConfirmingTerminate ? (
        <View
          style={{
            gap: 12,
            padding: 16,
            borderRadius: 16,
            backgroundColor: colors.errorContainer,
          }}
        >
          <View style={{ gap: 2 }}>
            <Text
              style={{
                color: colors.onErrorContainer,
                fontSize: 17,
                fontWeight: '700',
              }}
            >
              Terminate this Workout?
            </Text>
            <Text style={{ color: colors.onErrorContainer, fontSize: 15 }}>
              {`${workout.progress.done} of ${workout.progress.total} planned Sets are logged. Logged Sets are kept.`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip
              label="Terminate Workout"
              tone="inverse"
              onPress={actions.terminate}
            />
            <Chip label="Keep going" onPress={actions.cancelTerminate} />
          </View>
        </View>
      ) : null}
      {model.errorMessage ? (
        <View
          style={{
            padding: 16,
            borderRadius: 16,
            backgroundColor: colors.errorContainer,
          }}
        >
          <Text
            style={{
              color: colors.onErrorContainer,
              fontSize: 15,
              fontWeight: '600',
            }}
          >
            {model.errorMessage}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
