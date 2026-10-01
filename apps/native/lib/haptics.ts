import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

/** The only moments Benchmrk plays haptics for. */
export type HapticMoment =
  | 'set-completed'
  | 'target-met'
  | 'rest-ended'
  | 'group-event'
  | 'destructive-confirmation';

const PLAY: Record<HapticMoment, () => Promise<void>> = {
  'set-completed': () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  'target-met': () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  'rest-ended': () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  'group-event': () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  'destructive-confirmation': () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};

/** Plays a haptic for an allowed moment unless the member switched haptics off. */
export function useHaptics(): (moment: HapticMoment) => void {
  const settings = useQuery(api.memberSettings.get);
  const enabled = settings?.haptics ?? true;
  return useCallback(
    (moment: HapticMoment) => {
      if (enabled) void PLAY[moment]();
    },
    [enabled]
  );
}
