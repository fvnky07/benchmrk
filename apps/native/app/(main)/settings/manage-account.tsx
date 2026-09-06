import { Button, ListItem, Text } from '@expo/ui';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';
import { authClient } from '@/lib/auth';
import { useUserProfile } from '@/lib/hooks/use-user-profile';

export default function ManageAccountScreen() {
  const { user, username, bio } = useUserProfile();
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
      <ListItem supportingText={user.email ?? 'Not set'}>Email</ListItem>
      <ListItem supportingText={user.name ?? 'Not set'}>Name</ListItem>
      <ListItem supportingText={username}>Username</ListItem>
      <ListItem supportingText={bio ?? 'Not set'}>Bio</ListItem>
      <ListItem supportingText="Profile editing is not available yet.">
        Edit profile
      </ListItem>
      <ListItem supportingText="Password changes are not available yet.">
        Change password
      </ListItem>
      <ListItem supportingText="Permanent account deletion is not available yet. This action will not sign you out or delete anything.">
        Delete account
      </ListItem>
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Could not log out</ListItem>
      ) : null}
      {isConfirmingLogout ? (
        <>
          <ListItem supportingText="You will need to sign in again to access this account.">
            Confirm log out
          </ListItem>
          <Button
            disabled={isLoggingOut}
            label={isLoggingOut ? 'Logging out…' : 'Log out'}
            onPress={handleLogout}
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
    </NativeScreen>
  );
}
