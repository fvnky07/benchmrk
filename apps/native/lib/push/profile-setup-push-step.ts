import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';

const KEY_PREFIX = 'benchmrk.push.profile-setup.';
interface PushSetupState {
  loadedIdentityId: string | null;
  pendingIdentityId: string | null;
}
const usePushSetupStore = create<PushSetupState>(() => ({
  loadedIdentityId: null,
  pendingIdentityId: null,
}));

/** Keep the last Profile setup step reachable after the username is saved. */
export function usePushProfileSetupStep(
  identityId: string | undefined,
  needsProfile: boolean
) {
  const loadedIdentityId = usePushSetupStore((state) => state.loadedIdentityId);
  const pendingIdentityId = usePushSetupStore(
    (state) => state.pendingIdentityId
  );

  useEffect(() => {
    if (!identityId || loadedIdentityId === identityId) return;
    let disposed = false;
    const load = async () => {
      const pending =
        Platform.OS === 'web'
          ? null
          : await SecureStore.getItemAsync(`${KEY_PREFIX}${identityId}`);
      if (!disposed) {
        usePushSetupStore.setState({
          loadedIdentityId: identityId,
          pendingIdentityId: pending ? identityId : null,
        });
      }
    };
    void load().catch((error) => {
      console.warn('Could not read the Profile setup notification step', error);
      if (!disposed) {
        usePushSetupStore.setState({
          loadedIdentityId: identityId,
          pendingIdentityId: null,
        });
      }
    });
    return () => {
      disposed = true;
    };
  }, [identityId, loadedIdentityId]);

  useEffect(() => {
    if (
      !identityId ||
      !needsProfile ||
      loadedIdentityId !== identityId ||
      pendingIdentityId === identityId
    )
      return;
    usePushSetupStore.setState({ pendingIdentityId: identityId });
    if (Platform.OS !== 'web') {
      void SecureStore.setItemAsync(
        `${KEY_PREFIX}${identityId}`,
        'pending'
      ).catch((error) => {
        console.warn(
          'Could not remember the Profile setup notification step',
          error
        );
      });
    }
  }, [identityId, loadedIdentityId, needsProfile, pendingIdentityId]);

  return {
    loading: Boolean(identityId && loadedIdentityId !== identityId),
    pending: Boolean(identityId && pendingIdentityId === identityId),
  };
}

export async function completePushProfileSetup(identityId: string) {
  if (Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync(`${KEY_PREFIX}${identityId}`);
  }
  usePushSetupStore.setState({ pendingIdentityId: null });
}
