import { Button, ListItem, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import {
  analytics,
  authClient,
  reauthenticateWithApple,
  runSocialAuth,
} from '@/lib';
import { useAuth } from '@/lib/auth';
import { useHaptics } from '@/lib/haptics';

/** Must match APPLE_AUTHORIZATION_CODE_HEADER in the backend auth config. */
const APPLE_CODE_HEADER = 'x-apple-authorization-code';
const DELETION_IDENTITY_HEADER = 'x-deletion-identity-id';

type Methods = { password: boolean; apple: boolean; google: boolean };

const ERROR_COPY: Record<string, string> = {
  INVALID_PASSWORD: 'That password isn’t right. Nothing was deleted.',
  SESSION_EXPIRED: 'Confirm it’s you again. Nothing was deleted.',
  DELETION_IDENTITY_CHANGED:
    'The signed-in identity changed. Nothing was deleted.',
  APPLE_REAUTHENTICATION_REQUIRED:
    'Confirm with Apple first. Nothing was deleted.',
  APPLE_REVOCATION_FAILED: 'Apple didn’t confirm. Nothing was deleted.',
};

/**
 * Permanent deletion re-authenticates the original identity. Authentication is
 * revoked immediately; its owned data is then removed in scheduled batches.
 */
export default function DeleteAccountScreen() {
  const { user } = useAuth();
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
    const originalIdentityId = user?.id;
    if (!methods || busy || !originalIdentityId) return;
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
      const { data: session, error: sessionError } =
        await authClient.getSession();
      if (sessionError || session?.user.id !== originalIdentityId) {
        setErrorMessage(
          'The signed-in identity changed. Nothing was deleted. Sign in as the identity you meant to remove and try again.'
        );
        return;
      }

      const { error } = await authClient.deleteUser(
        methods.password ? { password } : {},
        {
          headers: {
            [DELETION_IDENTITY_HEADER]: originalIdentityId,
            ...(appleCode ? { [APPLE_CODE_HEADER]: appleCode } : {}),
          },
        }
      );
      if (error) {
        setErrorMessage(
          ERROR_COPY[error.code ?? ''] ??
            'Couldn’t finish deletion. Nothing was deleted; try again.'
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
        This permanently deletes this Benchmrk identity and its data: Routines,
        Workouts, Sets, custom Exercises, settings and profile. Sign-in stops
        right away; the remaining data is removed in the background.
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
        <ListItem supportingText="Your account uses Sign in with Apple, so deleting it needs an iPhone. You can also request deletion at benchmrk.app/delete-account.">
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
        label={busy ? 'Deleting…' : 'Delete account permanently'}
        onPress={deleteAccount}
      />
      <Button
        disabled={busy}
        label="Keep my account"
        variant="text"
        onPress={() => router.back()}
      />
    </NativeScreen>
  );
}
