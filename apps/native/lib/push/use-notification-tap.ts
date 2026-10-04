import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/** Group invite and event taps open the Group screen. */
export function useNotificationTap() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let disposed = false;
    let handledIdentifier: string | null = null;
    const openGroup = (response: Notifications.NotificationResponse | null) => {
      if (disposed || !response) return;
      const { request } = response.notification;
      const { data } = request.content;
      if (!data) return;
      const isInvite =
        data.type === 'groupInvite' && typeof data.inviteId === 'string';
      const isGroupEvent = data.type === 'groupEvent';
      if (
        response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER ||
        (!isInvite && !isGroupEvent) ||
        handledIdentifier === request.identifier
      ) {
        return;
      }
      handledIdentifier = request.identifier;
      router.push('/workout/group');
      void Notifications.clearLastNotificationResponseAsync().catch((error) => {
        console.warn('Could not clear the opened Group notification', error);
      });
    };
    const listener =
      Notifications.addNotificationResponseReceivedListener(openGroup);
    void Notifications.getLastNotificationResponseAsync()
      .then(openGroup)
      .catch((error) => {
        console.warn('Could not read the opened notification', error);
      });
    return () => {
      disposed = true;
      listener.remove();
    };
  }, []);
}
