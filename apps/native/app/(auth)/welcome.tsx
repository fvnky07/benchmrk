import { Button, ListItem, Text } from '@expo/ui';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { NativeScreen } from '@/components/native/native-screen';
import {
  isAppleAvailable,
  isGoogleAvailable,
  runSocialAuth,
  type SocialProvider,
} from '@/lib/auth';
import { showToast } from '@/lib/ui';

export default function WelcomeScreen() {
  const config = useQuery(api.auth.getSocialAuthConfig);
  const [appleNativeAvailable, setAppleNativeAvailable] = useState(false);
  const [busy, setBusy] = useState<SocialProvider | null>(null);

  useEffect(() => {
    void AppleAuthentication.isAvailableAsync().then(setAppleNativeAvailable);
  }, []);

  const signIn = async (provider: SocialProvider) => {
    if (!config || busy) return;
    setBusy(provider);
    try {
      const result = await runSocialAuth(provider, config, false);
      if (result.status === 'failure') {
        showToast.error('Sign in failed', result.message);
      }
    } finally {
      setBusy(null);
    }
  };

  const showApple = isAppleAvailable(config, appleNativeAvailable);
  const showGoogle = isGoogleAvailable(config);

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 32, fontWeight: '700' }}>Welcome</Text>
      <Text textStyle={{ fontSize: 17 }}>
        Track training, build consistency, and review your progress.
      </Text>
      {showApple ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={{ width: '100%', height: 48 }}
          onPress={() => {
            if (!busy) void signIn('apple');
          }}
        />
      ) : (
        <ListItem supportingText="Apple sign-in is not configured for this app.">
          Continue with Apple
        </ListItem>
      )}
      {showGoogle ? (
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Dark}
          style={{ width: '100%', height: 48 }}
          onPress={() => void signIn('google')}
          disabled={busy !== null}
        />
      ) : (
        <ListItem supportingText="Google sign-in is not configured for this app.">
          Continue with Google
        </ListItem>
      )}
      {busy ? <Text>{`Signing in with ${busy}…`}</Text> : null}
      <Button
        label="Create account"
        onPress={() => router.replace('/register')}
      />
      <Button
        label="Log in"
        variant="outlined"
        onPress={() => router.replace('/login')}
      />
    </NativeScreen>
  );
}
