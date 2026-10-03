import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const NOTIFICATION_ID = 'rest-end';
/** Sound and vibration are immutable channel settings, so each pair has its own channel. */
const CHANNELS: Readonly<
  Record<'sound' | 'silent', Readonly<Record<'haptics' | 'quiet', string>>>
> = {
  sound: {
    haptics: 'rest-end-sound-haptics',
    quiet: 'rest-end-sound-quiet',
  },
  silent: {
    haptics: 'rest-end-silent-haptics',
    quiet: 'rest-end-silent-quiet',
  },
};

async function ensureAndroidChannel(
  channelId: string,
  sound: boolean,
  haptics: boolean
) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(channelId, {
    name: `Rest over${sound ? '' : ' (silent)'}${haptics ? '' : ' (no vibration)'}`,
    importance: Notifications.AndroidImportance.HIGH,
    sound: sound ? 'default' : null,
    enableVibrate: haptics,
  });
}

/**
 * Keeps one local "Rest over" notification scheduled for the current rest:
 * scheduled at rest start, rescheduled when rest is adjusted, and cancelled
 * when it's skipped or the next Set ends it. The OS delivers it even when the
 * app is in the background. Never asks for permission; without it, only the
 * in-app timer runs.
 */
export function useRestEndNotification(
  endsAt: number | null,
  {
    sound,
    haptics,
    nextExercise,
  }: { sound: boolean; haptics: boolean; nextExercise: string | null }
) {
  useEffect(() => {
    let cancelled = false;
    const channelId =
      CHANNELS[sound ? 'sound' : 'silent'][haptics ? 'haptics' : 'quiet'];

    const sync = async () => {
      await cancelRestEndNotification();
      if (endsAt === null || endsAt <= Date.now()) return;
      const { granted } = await Notifications.getPermissionsAsync();
      if (!granted || cancelled) return;
      await ensureAndroidChannel(channelId, sound, haptics);
      if (cancelled) return;
      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_ID,
        content: {
          title: 'Rest over',
          body: nextExercise
            ? `Next: ${nextExercise}`
            : 'Time for your next Set',
          sound,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(endsAt),
          channelId,
        },
      });
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, [endsAt, sound, haptics, nextExercise]);
}

/** Cancels a pending "Rest over" alert, e.g. when the Workout ends. */
export function cancelRestEndNotification() {
  return Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
}
