import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/** The Group inbox remains authoritative, including an ended Group's message. */
export function useNotificationTap() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let disposed = false;
    let handledIdentifier: string | null = null;
    const openInvite = (
      response: Notifications.NotificationResponse | null
    ) => {
      if (disposed || !response) return;
      const { request } = response.notification;
      const { data } = request.content;
      if (!data) return;
      if (
        response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER ||
        data.type !== 'groupInvite' ||
        typeof data.inviteId !== 'string' ||
        handledIdentifier === request.identifier
      ) {
        return;
      }
      handledIdentifier = request.identifier;
      router.push('/workout/group');
      void Notifications.clearLastNotificationResponseAsync().catch((error) => {
        console.warn(
          'Could not clear the opened Group invite notification',
          error
        );
      });
    };
    const listener =
      Notifications.addNotificationResponseReceivedListener(openInvite);
    void Notifications.getLastNotificationResponseAsync()
      .then(openInvite)
      .catch((error) => {
        console.warn('Could not read the opened notification', error);
      });
    return () => {
      disposed = true;
      listener.remove();
    };
  }, []);
}
