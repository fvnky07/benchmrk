import { api } from '@repo/backend/convex/_generated/api';
import { useConvexAuth, useMutation } from 'convex/react';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { useAuth } from '@/lib/auth/hooks';
import { useNotificationTap } from './use-notification-tap';

const TOKEN_KEY = 'benchmrk.push.expo-token';
type RegisterDevice = (args: {
  token: string;
  platform: 'ios' | 'android';
}) => Promise<null>;
type UnregisterDevice = (args: { token: string }) => Promise<null>;
let registrationInFlight: Promise<void> | null = null;

/** Reads permission without prompting; onboarding and Groups own the offers. */
export function registerThisDevice(
  register: RegisterDevice,
  isActive: () => boolean = () => true
): Promise<void> {
  const sync = async () => {
    const platform = Platform.OS;
    if (platform !== 'ios' && platform !== 'android') return;
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted || !isActive()) return;
    if (platform === 'android') {
      await Notifications.setNotificationChannelAsync('group-invites', {
        name: 'Group invites',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }
    const configuredProjectId: unknown =
      Constants.expoConfig?.extra?.eas?.projectId;
    const projectId = Constants.easConfig?.projectId ?? configuredProjectId;
    if (typeof projectId !== 'string' || !projectId) {
      throw new Error(
        'The EAS projectId is missing from the native configuration'
      );
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    if (!isActive()) return;
    // Keep the token before registering: sign-out can then remove it even if
    // the backend succeeds but the response is lost.
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (!isActive()) return;
    await register({ token, platform });
  };
  // Queue a remount/identity change behind the old work, rather than sharing
  // a cancelled registration from the previous effect.
  const pending = (registrationInFlight ?? Promise.resolve())
    .catch(() => undefined)
    .then(sync)
    .finally(() => {
      if (registrationInFlight === pending) registrationInFlight = null;
    });
  registrationInFlight = pending;
  return pending;
}

/** Finish a pending registration before removing this device, before sign-out. */
export async function unregisterThisDevice(unregister: UnregisterDevice) {
  if (Platform.OS === 'web') return;
  await registrationInFlight?.catch(() => undefined);
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return;
  await unregister({ token });
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** Register on sign-in/app start, permission changes in Settings and token rotation. */
export function usePushRegistration() {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useAuth();
  const identityId = user?.id;
  const register = useMutation(api.deviceTokens.register);
  useNotificationTap();

  useEffect(() => {
    if (!isAuthenticated || !identityId || Platform.OS === 'web') return;
    let disposed = false;
    const sync = () => {
      void registerThisDevice(register, () => !disposed).catch((error) => {
        console.warn('Could not register this device for notifications', error);
      });
    };
    sync();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    const tokenChanges = Notifications.addPushTokenListener(sync);
    return () => {
      disposed = true;
      appState.remove();
      tokenChanges.remove();
    };
  }, [identityId, isAuthenticated, register]);
}
