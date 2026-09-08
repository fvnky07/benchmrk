import { Button, ListItem, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { analytics } from '@/lib/analytics';
import {
  authClient,
  isAppleAvailable,
  isGoogleAvailable,
  runSocialAuth,
  type SocialProvider,
} from '@/lib/auth';
import { useUserProfile } from '@/lib/hooks/use-user-profile';

export default function ManageAccountScreen() {
  const { user, username, bio } = useUserProfile();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const config = useQuery(api.auth.getSocialAuthConfig);
  const [accounts, setAccounts] = useState<SocialProvider[]>([]);
  const [linking, setLinking] = useState<SocialProvider | null>(null);
  const [appleNativeAvailable, setAppleNativeAvailable] = useState(false);

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('manage_account');
    }, [])
  );
  useFocusEffect(
    useCallback(() => {
      void AppleAuthentication.isAvailableAsync().then(setAppleNativeAvailable);
    }, [])
  );
  useFocusEffect(
    useCallback(() => {
      let active = true;
      authClient
        .listAccounts()
        .then((result) => {
          if (!active) return;
          setAccounts(
            (result.data ?? [])
              .map((account) => account.providerId)
              .filter(
                (provider): provider is SocialProvider =>
                  provider === 'apple' || provider === 'google'
              )
          );
        })
        .catch(() => setAccounts([]));
      return () => {
        active = false;
      };
    }, [])
  );

  const linkProvider = async (provider: SocialProvider) => {
    if (!config || linking) return;
    setLinking(provider);
    const result = await runSocialAuth(provider, config, true);
    setLinking(null);
    if (result.status === 'failure') setErrorMessage(result.message);
    if (result.status === 'success') {
      const refreshed = await authClient.listAccounts();
      setAccounts(
        (refreshed.data ?? [])
          .map((account) => account.providerId)
          .filter(
            (value): value is SocialProvider =>
              value === 'apple' || value === 'google'
          )
      );
    }
  };

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

  const availableProviders = (['apple', 'google'] as SocialProvider[]).filter(
    (provider) =>
      provider === 'apple'
        ? isAppleAvailable(config, appleNativeAvailable)
        : isGoogleAvailable(config)
  );
  const connectedProviders = new Set(accounts);

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        Manage account
      </Text>
      {availableProviders.map((provider) => (
        <Button
          key={provider}
          disabled={Boolean(linking) || connectedProviders.has(provider)}
          label={
            connectedProviders.has(provider)
              ? `${provider === 'apple' ? 'Apple' : 'Google'} connected`
              : linking === provider
                ? `Linking ${provider}…`
                : `Link ${provider === 'apple' ? 'Apple' : 'Google'}`
          }
          onPress={() => void linkProvider(provider)}
        />
      ))}
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
    </NativeScreen>
  );
}
