import TimerIcon from '@expo/material-symbols/timer.xml';
import { Icon, Row, Text } from '@expo/ui';
import { useEffect, useRef } from 'react';

import { useHaptics } from '@/lib/haptics';
import { space, tabularDigits, textColor, useColors } from '@/lib/ui';
import { formatClock } from '@/lib/workout/format';
import { GestureBox } from '@/modules/benchmrk-ui';

const TIMER = { ios: 'timer', android: TimerIcon } as const;
const ADJUST_SECONDS = 15;
const PULSE_FROM_SECONDS = 10;
const PILL_HEIGHT = 40;

type RestState = { endsAt: number };

type RestTimerProps = {
  rest: RestState | null;
  /** Shown faintly while idle: the rest the next Set will start. */
  plannedSeconds: number;
  now: number;
  onAdjust: (seconds: number) => void;
  onSkip: () => void;
  onReset: () => void;
  onOpenOptions: () => void;
};

/**
 * The rest pill in the Workout top bar: a stopwatch and the time left, which
 * pulses in the last 10 s, and a primary "Rest over" once rest ends. Tap for
 * options, swipe for ±15 s, long-press to restart the planned rest.
 */
export function RestTimer({
  rest,
  plannedSeconds,
  now,
  onAdjust,
  onSkip,
  onReset,
  onOpenOptions,
}: Readonly<RestTimerProps>) {
  const colors = useColors();
  const haptic = useHaptics();
  const remaining = rest ? Math.max(0, (rest.endsAt - now) / 1000) : null;
  const isResting = remaining !== null && remaining > 0;
  const isOver = remaining === 0;
  const wasResting = useRef(false);

  useEffect(() => {
    if (wasResting.current && isOver) haptic('rest-ended');
    wasResting.current = isResting;
  }, [haptic, isOver, isResting]);

  const clock = formatClock(Math.ceil(remaining ?? plannedSeconds));
  const tone =
    remaining !== null && remaining <= PULSE_FROM_SECONDS
      ? Math.floor(remaining) % 2 === 0
        ? colors.error
        : colors.tertiary
      : colors.primary;
  const fill = isOver ? colors.primary : colors.surfaceContainerHigh;
  const ink = isOver
    ? colors.onPrimary
    : isResting
      ? tone
      : colors.onSurfaceVariant;

  const act = (id: string) => {
    if (id === 'options') onOpenOptions();
    if (!isResting) return;
    if (id === 'add') onAdjust(ADJUST_SECONDS);
    if (id === 'subtract') onAdjust(-ADJUST_SECONDS);
    if (id === 'skip') onSkip();
    if (id === 'reset') onReset();
  };

  return (
    <GestureBox
      label={
        isResting
          ? `Rest, ${clock} left`
          : isOver
            ? 'Rest over'
            : `Planned rest ${clock}`
      }
      actions={[
        ...(isResting
          ? [
              { id: 'add', label: 'Add 15 seconds' },
              { id: 'subtract', label: 'Subtract 15 seconds' },
              { id: 'skip', label: 'Skip rest' },
              { id: 'reset', label: 'Restart planned rest' },
            ]
          : []),
        { id: 'options', label: 'Rest options' },
      ]}
      onTap={onOpenOptions}
      onLongPress={() => act('reset')}
      onSwipe={(direction) => act(direction === 1 ? 'add' : 'subtract')}
      onAction={act}
    >
      <Row
        alignment="center"
        spacing={6}
        style={{
          height: PILL_HEIGHT,
          paddingHorizontal: space.md,
          borderRadius: PILL_HEIGHT / 2,
          backgroundColor: fill,
        }}
      >
        <Icon name={TIMER} size={18} color={ink} />
        <Text
          textStyle={{ fontSize: 15, fontWeight: '700', color: textColor(ink) }}
          modifiers={tabularDigits()}
        >
          {isOver ? 'Rest over' : clock}
        </Text>
      </Row>
    </GestureBox>
  );
}
