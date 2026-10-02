import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/** "Still working out?" comes after this long without activity. */
export const IDLE_MS = 20 * 60 * 1000;

const NOTIFICATION_ID = 'still-working-out';
const CATEGORY = 'still-working-out';
const CHANNEL = 'still-working-out';
const FINISH_ACTION = 'finish';

async function prepare() {
  await Notifications.setNotificationCategoryAsync(CATEGORY, [
    {
      identifier: FINISH_ACTION,
      buttonTitle: 'Finish Workout',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'keep-going',
      buttonTitle: 'Keep going',
      options: { opensAppToForeground: false },
    },
  ]);
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Still working out?',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** Cancels the pending "Still working out?" alert, e.g. when the Workout ends. */
export function cancelStillWorkingOut() {
  return Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
}

/**
 * Keeps one "Still working out?" local notification scheduled 20 minutes after
 * the last activity, rescheduled on every activity. Its Finish option ends the
 * Workout (at the last completed Set). While the app is open the screen shows
 * the same prompt instead. Never asks for permission.
 */
export function useStillWorkingOut({
  enabled,
  lastActivity,
  now,
  onFinish,
}: {
  /** Only while a Workout is active. */
  enabled: boolean;
  /** The latest recorded moment of the Workout. */
  lastActivity: number;
  now: number;
  onFinish: () => void;
}) {
  const [localActivity, setLocalActivity] = useState(0);
  const activity = Math.max(lastActivity, localActivity);
  const markActive = useCallback(() => setLocalActivity(Date.now()), []);
  const finish = useRef(onFinish);
  finish.current = onFinish;

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      await cancelStillWorkingOut();
      if (!enabled) return;
      const { granted } = await Notifications.getPermissionsAsync();
      if (!granted || cancelled) return;
      await prepare();
      if (cancelled) return;
      await Notifications.scheduleNotificationAsync({
        identifier: NOTIFICATION_ID,
        content: {
          title: 'Still working out?',
          body: 'Your Workout is still running. Finish it, or keep going.',
          categoryIdentifier: CATEGORY,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(activity + IDLE_MS),
          channelId: CHANNEL,
        },
      });
    };
    void sync();
    return () => {
      cancelled = true;
    };
  }, [enabled, activity]);

  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (
      enabled &&
      response?.notification.request.identifier === NOTIFICATION_ID &&
      response.actionIdentifier === FINISH_ACTION
    ) {
      void Notifications.clearLastNotificationResponseAsync();
      finish.current();
    }
  }, [enabled, response]);

  return {
    /** Idle for 20 minutes while the app is open. */
    isIdle: enabled && now - activity >= IDLE_MS,
    /** Every interaction moves the idle deadline, including unsaved edits. */
    markActive,
  };
}
