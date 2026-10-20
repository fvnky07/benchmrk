import { Button, Column, Row, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { EmailVerificationRow } from '@/components/account/email-verification-row';
import { SignInMethods } from '@/components/account/sign-in-methods';
import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';
import { authClient } from '@/lib/auth/client';
import { useUserProfile } from '@/lib/hooks/use-user-profile';
import { unregisterThisDevice } from '@/lib/push/use-push-registration';
import { font, space, textColor, useColors } from '@/lib/ui';

export default function ManageAccountScreen() {
  const colors = useColors();
  const { user, username, bio } = useUserProfile();
  const unregister = useMutation(api.deviceTokens.unregister);
  // `EmailVerificationRow` renders nothing until this loads; gate it here so
  // `Card divided` draws no leading hairline. Convex shares the subscription.
  const verification = useQuery(api.auth.getEmailVerification);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('manage_account');
    }, [])
  );

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setErrorMessage(null);
      await unregisterThisDevice(unregister);
      await authClient.signOut();
      router.replace('/');
    } catch {
      setErrorMessage('Failed to log out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <NativeScreen>
        <Text
          textStyle={{
            ...font.body,
            color: textColor(colors.onSurfaceVariant),
          }}
        >
          Loading your Benchmrk identity…
        </Text>
      </NativeScreen>
    );
  }

  return (
    <NativeScreen>
      <Card divided>
        {verification ? <EmailVerificationRow /> : null}
        <CardRow supportingText={user.name ?? 'Not set'}>Name</CardRow>
        <CardRow supportingText={username}>Username</CardRow>
        <CardRow supportingText={bio ?? 'Not set'}>Bio</CardRow>
      </Card>
      <Card divided>
        <CardRow
          chevron
          supportingText="Username, bio and photo"
          onPress={() => router.push('/(main)/settings/edit-profile')}
        >
          Edit profile
        </CardRow>
        <CardRow
          chevron
          supportingText="Signs out your other devices"
          onPress={() => router.push('/(main)/settings/change-password')}
        >
          Change password
        </CardRow>
        <CardRow
          chevron
          supportingText={
            user.twoFactorEnabled === true ? 'On' : 'Authenticator app codes'
          }
          onPress={() => router.push('/(main)/settings/two-factor')}
        >
          Two-factor authentication
        </CardRow>
      </Card>
      <SignInMethods />
      {errorMessage ? (
        <Card>
          <CardRow supportingText={errorMessage}>
            Could not complete action
          </CardRow>
        </Card>
      ) : null}
      {isConfirmingLogout ? (
        <Card tone="high" padding={space.lg} spacing={space.md}>
          <Column spacing={2}>
            <Text
              textStyle={{
                ...font.bodyStrong,
                color: textColor(colors.onSurface),
              }}
            >
              Confirm log out
            </Text>
            <Text
              textStyle={{
                ...font.caption,
                color: textColor(colors.onSurfaceVariant),
              }}
            >
              You will need to sign in again to access this Benchmrk identity.
            </Text>
          </Column>
          <Row spacing={space.sm}>
            <Button
              disabled={isLoggingOut}
              label={isLoggingOut ? 'Logging out…' : 'Log out'}
              onPress={() => void handleLogout()}
            />
            <Button
              disabled={isLoggingOut}
              label="Cancel"
              variant="outlined"
              onPress={() => setIsConfirmingLogout(false)}
            />
          </Row>
        </Card>
      ) : (
        <Button
          label="Log out"
          variant="outlined"
          onPress={() => setIsConfirmingLogout(true)}
        />
      )}
      <Card>
        <CardRow
          chevron
          supportingText="Permanently delete your Benchmrk identity and all its data"
          onPress={() => router.push('/(main)/settings/delete-account')}
        >
          <Text textStyle={{ ...font.body, color: textColor(colors.error) }}>
            Delete account
          </Text>
        </CardRow>
      </Card>
    </NativeScreen>
  );
}
