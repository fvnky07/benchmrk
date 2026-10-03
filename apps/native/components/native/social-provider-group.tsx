import { Column, RNHostView } from '@expo/ui';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useNetworkState } from 'expo-network';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  isAppleAvailable,
  isGoogleAvailable,
  runSocialAuth,
  type SocialProvider,
} from '@/lib/auth/social';
import { runPendingSocialAuth, useAuthStore } from '@/lib/auth/store';
import { useAppearance } from '@/lib/ui';

import { AuthDivider, AuthStatus, useAuthColumnWidth } from './auth-shell';

const PROVIDER_NAME: Record<SocialProvider, string> = {
  apple: 'Apple',
  google: 'Google',
};

type Status = { message: string; tone: 'neutral' | 'error' } | null;

/**
 * Apple (iOS only) and Google sign-in, shown only when the provider can
 * complete authentication here. Requests are locked while one is running and
 * after success until navigation replaces the route.
 */
export function SocialProviderGroup({
  dividerPosition,
}: Readonly<{ dividerPosition: 'before' | 'after' }>) {
  const config = useQuery(api.auth.getSocialAuthConfig);
  const network = useNetworkState();
  const { resolvedAppearance } = useAppearance();
  const columnWidth = useAuthColumnWidth();
  const [appleNative, setAppleNative] = useState<boolean | null>(
    Platform.OS === 'ios' ? null : false
  );
  const pendingPath = useAuthStore((state) => state.pendingPath);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AppleAuthentication.isAvailableAsync().then(setAppleNative);
  }, []);

  const isOffline =
    network.isConnected === false || network.isInternetReachable === false;
  const isResolved = config !== undefined && appleNative !== null;
  const showApple = isAppleAvailable(config, appleNative ?? false);
  const showGoogle = isGoogleAvailable(config);
  const isLocked = pendingPath !== null || isOffline;

  const signIn = async (provider: SocialProvider) => {
    if (!config || isLocked) return;
    try {
      const result = await runPendingSocialAuth(provider, async () => {
        setStatus({
          message: `Signing in with ${PROVIDER_NAME[provider]}…`,
          tone: 'neutral',
        });
        return runSocialAuth(provider, config);
      });
      if (!result) return;
      if (result.status === 'success') {
        setStatus({
          message: 'Signed in. Loading your Benchmrk identity…',
          tone: 'neutral',
        });
      } else if (result.status === 'cancelled') {
        setStatus({
          message: `Sign-in with ${PROVIDER_NAME[provider]} was cancelled.`,
          tone: 'neutral',
        });
      } else {
        setStatus({ message: `${result.message} Try again.`, tone: 'error' });
      }
    } catch {
      setStatus({
        message: 'Couldn’t complete sign-in. Try again.',
        tone: 'error',
      });
    }
  };

  if (isResolved && !showApple && !showGoogle && !isOffline) return null;

  const divider = <AuthDivider />;

  return (
    <Column spacing={12}>
      {dividerPosition === 'before' ? divider : null}
      {isOffline ? (
        <AuthStatus
          message="You’re offline. Connect to the internet to sign in; sign-in options come back automatically."
          tone="error"
        />
      ) : !isResolved ? (
        <AuthStatus message="Loading sign-in options…" />
      ) : null}
      {showApple ? (
        <RNHostView matchContents>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              resolvedAppearance === 'dark'
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={10}
            style={{
              width: columnWidth,
              height: 48,
              opacity: isLocked ? 0.5 : 1,
            }}
            onPress={() => void signIn('apple')}
          />
        </RNHostView>
      ) : null}
      {showGoogle ? (
        <RNHostView matchContents>
          <GoogleSigninButton
            size={GoogleSigninButton.Size.Wide}
            color={
              resolvedAppearance === 'dark'
                ? GoogleSigninButton.Color.Light
                : GoogleSigninButton.Color.Dark
            }
            style={{ width: columnWidth, height: 48 }}
            disabled={isLocked}
            onPress={() => void signIn('google')}
          />
        </RNHostView>
      ) : null}
      {status ? (
        <AuthStatus message={status.message} tone={status.tone} />
      ) : null}
      {dividerPosition === 'after' ? divider : null}
    </Column>
  );
}
