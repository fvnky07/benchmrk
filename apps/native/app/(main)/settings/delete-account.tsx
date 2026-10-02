import { Button, ListItem, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { analytics } from '@/lib/analytics';
import { authClient } from '@/lib/auth/client';
import { reauthenticateWithApple, runSocialAuth } from '@/lib/auth/social';
import { useHaptics } from '@/lib/haptics';

/** Must match APPLE_AUTHORIZATION_CODE_HEADER in the backend auth config. */
const APPLE_CODE_HEADER = 'x-apple-authorization-code';

type Methods = { password: boolean; apple: boolean; google: boolean };

const ERROR_COPY: Record<string, string> = {
  INVALID_PASSWORD: 'That password isn’t right. Nothing was deleted.',
  SESSION_EXPIRED: 'Confirm it’s you again. Nothing was deleted.',
  APPLE_REAUTHENTICATION_REQUIRED:
    'Confirm with Apple first. Nothing was deleted.',
  APPLE_REVOCATION_FAILED: 'Apple didn’t confirm. Nothing was deleted.',
};

/**
 * Permanent deletion: re-authenticate (the password, or signing in again with
 * Apple or Google), confirm, and everything is removed at once on the server.
 * On any failure nothing is deleted and the Benchmrk identity keeps working.
 */
export default function DeleteAccountScreen() {
  const config = useQuery(api.auth.getSocialAuthConfig);
  const haptic = useHaptics();
  const [methods, setMethods] = useState<Methods | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void authClient.listAccounts().then(({ data }) => {
      const providers = new Set(
        (data ?? []).map((account) => account.providerId)
      );
      setMethods({
        password: providers.has('credential'),
        apple: providers.has('apple'),
        google: providers.has('google'),
      });
    });
  }, []);

  const deleteAccount = async () => {
    if (!methods || busy) return;
    haptic('destructive-confirmation');
    setErrorMessage(null);
    setBusy(true);
    try {
      let appleCode: string | null = null;
      if (methods.apple) {
        const apple = await reauthenticateWithApple();
        if (apple.status !== 'success') {
          setErrorMessage(
            apple.status === 'cancelled'
              ? 'Apple confirmation was cancelled. Nothing was deleted.'
              : apple.message
          );
          return;
        }
        appleCode = apple.authorizationCode;
      } else if (!methods.password && methods.google && config) {
        const google = await runSocialAuth('google', config);
        if (google.status !== 'success') {
          setErrorMessage(
            google.status === 'cancelled'
              ? 'Google confirmation was cancelled. Nothing was deleted.'
              : google.message
          );
          return;
        }
      }

      const { error } = await authClient.deleteUser(
        methods.password ? { password } : {},
        appleCode ? { headers: { [APPLE_CODE_HEADER]: appleCode } } : undefined
      );
      if (error) {
        setErrorMessage(
          ERROR_COPY[error.code ?? ''] ??
            'Couldn’t delete your Benchmrk identity. Nothing was deleted; try again.'
        );
        return;
      }
      analytics.accountDeleted();
      await authClient.signOut().catch(() => undefined);
      router.replace('/');
    } catch {
      setErrorMessage(
        'Couldn’t reach benchmrk. Nothing was deleted; check your connection and try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const appleUnavailable = methods?.apple === true && Platform.OS !== 'ios';

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 17 }}>
        This permanently deletes your Benchmrk identity and everything in it:
        Routines, Workouts, Sets, custom Exercises, settings and your profile.
        It happens right away and can’t be undone.
      </Text>
      {methods?.password ? (
        <NativeTextField
          autoCapitalize="none"
          autoComplete="password"
          editable={!busy}
          label="Password"
          onChangeText={setPassword}
          secureTextEntry
          value={password}
        />
      ) : null}
      {methods && !methods.password && !methods.apple && methods.google ? (
        <ListItem supportingText="You’ll sign in with Google once more to confirm it’s you.">
          Confirm with Google
        </ListItem>
      ) : null}
      {methods?.apple && !appleUnavailable ? (
        <ListItem supportingText="You’ll confirm with Apple, which also removes benchmrk’s access to your Apple ID.">
          Confirm with Apple
        </ListItem>
      ) : null}
      {appleUnavailable ? (
        <ListItem supportingText="Your Benchmrk identity uses Sign in with Apple, so deleting it needs an iPhone. You can also request deletion at benchmrk.app/delete-account.">
          Delete from an iPhone
        </ListItem>
      ) : null}
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Not deleted</ListItem>
      ) : null}
      <Button
        disabled={
          !methods ||
          busy ||
          appleUnavailable ||
          (methods.password && password === '')
        }
        label={busy ? 'Deleting…' : 'Delete Benchmrk identity permanently'}
        onPress={deleteAccount}
      />
      <Button
        disabled={busy}
        label="Keep my Benchmrk identity"
        variant="text"
        onPress={() => router.back()}
      />
    </NativeScreen>
  );
}
