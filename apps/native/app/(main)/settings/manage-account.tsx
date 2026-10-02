import { Button, ListItem, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { EmailVerificationRow } from '@/components/account/email-verification-row';
import { SignInMethods } from '@/components/account/sign-in-methods';
import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';
import { authClient } from '@/lib/auth/client';
import { useUserProfile } from '@/lib/hooks/use-user-profile';
import { unregisterThisDevice } from '@/lib/push/use-push-registration';

export default function ManageAccountScreen() {
  const { user, username, bio } = useUserProfile();
  const unregister = useMutation(api.deviceTokens.unregister);
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
        <Text textStyle={{ fontSize: 17 }}>Loading account…</Text>
      </NativeScreen>
    );
  }

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        Manage account
      </Text>
      <EmailVerificationRow />
      <ListItem supportingText={user.name ?? 'Not set'}>Name</ListItem>
      <ListItem supportingText={username}>Username</ListItem>
      <ListItem supportingText={bio ?? 'Not set'}>Bio</ListItem>
      <ListItem
        supportingText="Username, bio and photo"
        onPress={() => router.push('/(main)/settings/edit-profile')}
      >
        Edit profile
      </ListItem>
      <ListItem
        supportingText="Signs out your other devices"
        onPress={() => router.push('/(main)/settings/change-password')}
      >
        Change password
      </ListItem>
      <ListItem
        supportingText={
          user.twoFactorEnabled === true ? 'On' : 'Authenticator app codes'
        }
        onPress={() => router.push('/(main)/settings/two-factor')}
      >
        Two-factor authentication
      </ListItem>
      <SignInMethods />
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>
          Could not complete action
        </ListItem>
      ) : null}
      {isConfirmingLogout ? (
        <>
          <ListItem supportingText="You will need to sign in again to access this account.">
            Confirm log out
          </ListItem>
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
        </>
      ) : (
        <Button label="Log out" onPress={() => setIsConfirmingLogout(true)} />
      )}
      <ListItem
        supportingText="Permanently delete your account and all its data"
        onPress={() => router.push('/(main)/settings/delete-account')}
      >
        Delete account
      </ListItem>
    </NativeScreen>
  );
}
