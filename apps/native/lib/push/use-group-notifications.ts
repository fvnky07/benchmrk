import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { showToast } from '@/lib/ui/toast';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => {
      const isForeground = AppState.currentState === 'active';
      return {
        shouldShowBanner: !isForeground,
        shouldShowList: !isForeground,
        shouldPlaySound: !isForeground,
        shouldSetBadge: !isForeground,
      };
    },
  });
}

/** Group pushes become in-app banners; pending invites own the icon badge. */
export function useGroupNotifications() {
  const inbox = useQuery(api.groupInvites.inbox);
  const pendingInvites = inbox?.reduce(
    (count, invite) => count + (invite.state === 'pending' ? 1 : 0),
    0
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const received = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (AppState.currentState !== 'active') return;
        const { body, data } = notification.request.content;
        if (
          body &&
          (data?.type === 'groupInvite' || data?.type === 'groupEvent')
        ) {
          showToast.info(body);
        }
      }
    );
    return () => received.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || pendingInvites === undefined) return;
    const syncBadge = () => {
      void Notifications.setBadgeCountAsync(pendingInvites).catch((error) => {
        console.warn('Could not update the pending Group invites badge', error);
      });
    };
    syncBadge();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncBadge();
    });
    return () => appState.remove();
  }, [pendingInvites]);
}
