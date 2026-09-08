import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
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
    <SafeAreaView
      className="flex-1 justify-between bg-green-1 px-4 pb-6"
      edges={['top', 'bottom']}
    >
      <View className="w-full items-center justify-center py-6">
        <Text className="text-center text-4xl">Welcome</Text>
      </View>
      <View className="w-full items-center justify-center gap-4">
        <View className="w-full flex-col gap-4">
          {showApple && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={
                AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={8}
              style={{ width: '100%', height: 48 }}
              onPress={() => {
                if (!busy) void signIn('apple');
              }}
            />
          )}
          {showGoogle && (
            <GoogleSigninButton
              size={GoogleSigninButton.Size.Wide}
              color={GoogleSigninButton.Color.Dark}
              style={{ width: '100%', height: 48 }}
              onPress={() => void signIn('google')}
              disabled={busy !== null}
            />
          )}
          {busy && <Text className="text-center">Signing in with {busy}…</Text>}
        </View>
        {(showApple || showGoogle) && <Separator />}
        <View className="mb-6 flex w-full flex-row gap-4">
          <Button
            variant="secondary"
            className="grow"
            onPress={() => router.replace('/register')}
          >
            <Text>Register</Text>
          </Button>
          <Separator orientation="vertical" />
          <Button
            variant="secondary"
            className="grow"
            onPress={() => router.replace('/login')}
          >
            <Text>Login</Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
