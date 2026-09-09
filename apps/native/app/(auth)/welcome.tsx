import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import {
  AuthDivider,
  AuthLegalPlaceholder,
  AuthProviderGroup,
  AuthRouteActions,
  AuthShell,
} from '@/components/native/auth-shell';
import {
  isAppleAvailable,
  isGoogleAvailable,
  runSocialAuth,
  type SocialProvider,
} from '@/lib/auth';

export default function WelcomeScreen() {
  const config = useQuery(api.auth.getSocialAuthConfig);
  const [appleNativeAvailable, setAppleNativeAvailable] = useState(false);
  const [appleCapabilityResolved, setAppleCapabilityResolved] = useState(false);
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync()
      .then((available) => {
        setAppleNativeAvailable(available);
        setAppleCapabilityResolved(true);
      })
      .catch(() => {
        setAppleCapabilityResolved(true);
      });
  }, []);

  const signIn = async (provider: SocialProvider) => {
    if (!config || busy) return;
    setStatus(null);
    setBusy(provider);
    try {
      const result = await runSocialAuth(provider, config, false);
      if (result.status === 'cancelled') {
        setStatus('Sign-in cancelled. You can try again when ready.');
      } else if (result.status === 'failure') {
        setStatus(
          result.message ||
            'Sign-in failed. Check your connection and try again.'
        );
      } else {
        setStatus('Signed in. Loading your Benchmrk identity…');
      }
    } catch {
      setStatus('Sign-in failed. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  const showApple = isAppleAvailable(config, appleNativeAvailable);
  const showGoogle = isGoogleAvailable(config);

  return (
    <AuthShell>
      <Text
        accessibilityRole="header"
        style={{ fontSize: 32, fontWeight: '700' }}
      >
        Welcome
      </Text>
      <Text style={{ fontSize: 17 }} selectable>
        Track training, build consistency, and review your progress.
      </Text>
      <AuthProviderGroup
        appleAvailable={showApple}
        appleCapabilityResolved={appleCapabilityResolved}
        busy={busy}
        configResolved={config !== undefined}
        googleAvailable={showGoogle}
        onPress={signIn}
        status={status}
      />
      <AuthDivider />
      <AuthRouteActions />
      <AuthLegalPlaceholder />
    </AuthShell>
  );
}
