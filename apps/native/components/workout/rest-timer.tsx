import { Column, Text } from '@expo/ui';
import { useEffect, useRef } from 'react';

import { useHaptics } from '@/lib/haptics';
import { THEME, useAppearance } from '@/lib/ui';
import { formatClock } from '@/lib/workout/format';
import { GestureBox } from '@/modules/benchmrk-ui';
import { RestRing } from './rest-ring';

const ADJUST_SECONDS = 15;
const PULSE_FROM_SECONDS = 10;
const REST_COLOR = '#2a6fd6';
const PULSE_COLORS = ['#d33a32', '#d97706'] as const;
const DONE_COLOR = '#2e9e4f';

export type RestState = {
  startedAt: number;
  endsAt: number;
  plannedSeconds: number;
  adjustedSeconds: number;
};

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
 * The rest timer beside the Exercise title: a draining ring that pulses in the
 * last 10 s and turns green when rest is over. Tap for options, swipe for
 * ±15 s, long-press to restart the planned rest.
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
  const { resolvedAppearance } = useAppearance();
  const colors = THEME[resolvedAppearance];
  const haptic = useHaptics();
  const remaining = rest ? Math.max(0, (rest.endsAt - now) / 1000) : null;
  const isResting = remaining !== null && remaining > 0;
  const isOver = remaining === 0;
  const wasResting = useRef(false);

  useEffect(() => {
    if (wasResting.current && isOver) haptic('rest-ended');
    wasResting.current = isResting;
  }, [haptic, isOver, isResting]);

  const total = rest ? rest.plannedSeconds + rest.adjustedSeconds : 0;
  const clock = formatClock(Math.ceil(remaining ?? plannedSeconds));
  const color =
    remaining !== null && remaining <= PULSE_FROM_SECONDS
      ? PULSE_COLORS[Math.floor(remaining) % 2]
      : REST_COLOR;

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
      <Column alignment="center" style={{ width: 64 }}>
        {isResting ? (
          <RestRing
            fraction={total > 0 ? (remaining ?? 0) / total : 0}
            label={clock}
            color={color}
          />
        ) : isOver ? (
          <Text
            textStyle={{ fontSize: 15, fontWeight: '700', color: DONE_COLOR }}
          >
            ✓ Rest
          </Text>
        ) : (
          <Text textStyle={{ fontSize: 15, color: colors.mutedForeground }}>
            {clock}
          </Text>
        )}
      </Column>
    </GestureBox>
  );
}
