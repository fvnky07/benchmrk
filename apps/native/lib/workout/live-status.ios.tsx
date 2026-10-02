import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  monospacedDigit,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

import type { WorkoutLiveStatus } from './live-status-types';

type WorkoutStatusProps = {
  startedAt: number;
  setsDone: number;
  setsPlanned: number;
  restStartedAt: number | null;
  restEndsAt: number | null;
};

/**
 * One Live Activity per Workout. While resting it counts the rest down;
 * once rest passes its end (the activity goes stale, even without the app)
 * or there's none, it shows elapsed time and Sets done.
 */
function WorkoutStatus(
  props: WorkoutStatusProps,
  environment: LiveActivityEnvironment
) {
  'widget';
  const resting =
    props.restStartedAt !== null &&
    props.restEndsAt !== null &&
    !environment.isStale;
  const tint = environment.isLuminanceReduced ? '#FFFFFF' : '#2E9E4F';
  const clock = (size: number) =>
    resting ? (
      <Text
        timerInterval={{
          lower: new Date(props.restStartedAt ?? 0),
          upper: new Date(props.restEndsAt ?? 0),
        }}
        countsDown
        modifiers={[font({ size, weight: 'bold' }), monospacedDigit()]}
      />
    ) : (
      <Text
        date={new Date(props.startedAt)}
        dateStyle="timer"
        modifiers={[font({ size, weight: 'bold' }), monospacedDigit()]}
      />
    );
  const label = resting ? 'Rest' : 'Workout';
  const sets = `${props.setsDone} of ${props.setsPlanned} Sets`;
  const icon = (
    <Image
      systemName={resting ? 'timer' : 'figure.strengthtraining.traditional'}
      color={tint}
    />
  );

  return {
    banner: (
      <HStack modifiers={[padding({ all: 16 })]}>
        {icon}
        <VStack alignment="leading">
          <Text modifiers={[font({ size: 15, weight: 'semibold' })]}>
            {label}
          </Text>
          <Text modifiers={[font({ size: 13 }), foregroundStyle('secondary')]}>
            {sets}
          </Text>
        </VStack>
        <Spacer />
        {clock(28)}
      </HStack>
    ),
    compactLeading: icon,
    compactTrailing: clock(14),
    minimal: icon,
    expandedLeading: (
      <VStack alignment="leading" modifiers={[padding({ all: 8 })]}>
        {icon}
        <Text modifiers={[font({ size: 13 })]}>{label}</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" modifiers={[padding({ all: 8 })]}>
        {clock(22)}
      </VStack>
    ),
    expandedBottom: (
      <Text modifiers={[font({ size: 13 }), foregroundStyle('secondary')]}>
        {sets}
      </Text>
    ),
  };
}

const WorkoutStatusActivity = createLiveActivity(
  'WorkoutStatus',
  WorkoutStatus
);

/**
 * Keeps one Live Activity in step with the active Workout: started with it,
 * updated as Sets complete and rest starts or ends, ended with it.
 */
export function syncLiveStatus(status: WorkoutLiveStatus | null) {
  const [current, ...extra] = WorkoutStatusActivity.getInstances();
  for (const instance of extra) void instance.end('immediate');
  if (!status) {
    void current?.end('immediate');
    return;
  }
  const props: WorkoutStatusProps = {
    startedAt: status.startedAt,
    setsDone: status.setsDone,
    setsPlanned: status.setsPlanned,
    restStartedAt: status.rest?.startedAt ?? null,
    restEndsAt: status.rest?.endsAt ?? null,
  };
  // Stale at the rest end: the layout switches back to elapsed time by itself.
  const staleDate = status.rest ? new Date(status.rest.endsAt) : undefined;
  if (current) {
    void current.update(props, staleDate);
  } else {
    WorkoutStatusActivity.start(props, status.url, staleDate);
  }
}
