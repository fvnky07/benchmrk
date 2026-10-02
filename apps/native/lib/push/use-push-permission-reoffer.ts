import { api } from '@repo/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';

import { registerThisDevice } from './use-push-registration';

export const PUSH_PERMISSION_TITLE = 'Get Group invites and rest timers';
export const PUSH_PERMISSION_EXPLANATION =
  'Get notified when someone invites you to a Group and when your rest timer ends. You can change notifications in Settings at any time.';

const REOFFER_KEY = 'benchmrk.push.permission-reoffered';
let offering = false;

/** Create Android's channel only after an Allow action, before its OS prompt. */
export async function requestPushPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('group-invites', {
      name: 'Group invites',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }
  return Notifications.requestPermissionsAsync();
}

/** One device-local second offer, only while the OS has not recorded a choice. */
export function usePushPermissionReoffer() {
  const register = useMutation(api.deviceTokens.register);
  return useCallback(async () => {
    if (Platform.OS === 'web' || offering) return;
    offering = true;
    try {
      const permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'undetermined') return;
      if (await SecureStore.getItemAsync(REOFFER_KEY)) return;
      await SecureStore.setItemAsync(REOFFER_KEY, 'true');
      const allow = await new Promise<boolean>((resolve) => {
        Alert.alert(
          PUSH_PERMISSION_TITLE,
          PUSH_PERMISSION_EXPLANATION,
          [
            { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Allow', onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) }
        );
      });
      if (allow) {
        const result = await requestPushPermission();
        if (result.granted) await registerThisDevice(register);
      }
    } catch (error) {
      console.warn('Could not offer notification permission', error);
    } finally {
      offering = false;
    }
  }, [register]);
}
