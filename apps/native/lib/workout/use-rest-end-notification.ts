import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const NOTIFICATION_ID = 'rest-end';
/** Android fixes a channel's sound when it's created, so sound and silence get one each. */
const CHANNELS = {
  sound: 'rest-end-sound',
  silent: 'rest-end-silent',
} as const;

async function ensureAndroidChannel(sound: boolean) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(
    sound ? CHANNELS.sound : CHANNELS.silent,
    {
      name: sound ? 'Rest over' : 'Rest over (silent)',
      importance: Notifications.AndroidImportance.HIGH,
      sound: sound ? 'default' : null,
      enableVibrate: true,
    }
  );
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
  { sound, nextExercise }: { sound: boolean; nextExercise: string | null }
) {
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      await cancelRestEndNotification();
      if (endsAt === null || endsAt <= Date.now()) return;
      const { granted } = await Notifications.getPermissionsAsync();
      if (!granted || cancelled) return;
      await ensureAndroidChannel(sound);
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
          channelId: sound ? CHANNELS.sound : CHANNELS.silent,
        },
      });
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, [endsAt, sound, nextExercise]);
}

/** Cancels a pending "Rest over" alert, e.g. when the Workout ends. */
export function cancelRestEndNotification() {
  return Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
}
