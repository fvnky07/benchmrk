import { Ionicons } from '@expo/vector-icons';
import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import {
  authClient,
  isAppleAvailable,
  isGoogleAvailable,
  runSocialAuth,
  type SocialProvider,
} from '@/lib/auth';
import { useUserProfile } from '@/lib/hooks/use-user-profile';
import { showToast } from '@/lib/ui';

const iconColor = '#00ff90';

export default function ManageAccountScreen() {
  const { user, username, bio } = useUserProfile();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('manage_account');
    }, [])
  );

  const config = useQuery(api.auth.getSocialAuthConfig);
  const [accounts, setAccounts] = useState<SocialProvider[]>([]);
  const [linking, setLinking] = useState<SocialProvider | null>(null);

  const [appleNativeAvailable, setAppleNativeAvailable] = useState(false);
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
    if (result.status === 'failure')
      showToast.error('Link failed', result.message);
    if (result.status === 'success')
      showToast.success('Account linked', 'Your provider is now connected.');
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
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await authClient.signOut();
            router.replace('/');
          } catch {
            Alert.alert('Error', 'Failed to log out. Please try again.');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              analytics.accountDeleted();
              // TODO: call backend deletion mutation
              await authClient.signOut();
              router.replace('/');
            } catch {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  // Edit Profile and Change Password not yet implemented;
  // Pressables below are disabled until those flows ship.

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1">
        <ActivityIndicator size="large" color={iconColor} />
        <Text className="mt-4 text-gray-400">Loading account…</Text>
      </View>
    );
  }
  const availableProviders = (['apple', 'google'] as SocialProvider[]).filter(
    (provider) =>
      provider === 'apple'
        ? isAppleAvailable(config ?? undefined, appleNativeAvailable)
        : isGoogleAvailable(config ?? undefined)
  );
  const connectedProviders = new Set(accounts);
  return (
    <ScrollView className="flex-1 bg-black-1">
      {/* Account Information */}
      {availableProviders.length > 0 && (
        <View className="mt-6">
          <Text className="px-4 pb-2 font-semibold text-white/60 text-xs">
            CONNECTED ACCOUNTS
          </Text>
          <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
            {availableProviders.map((provider) => (
              <Pressable
                key={provider}
                className="h-12 flex-row items-center border-gray-800 border-b px-4"
                onPress={
                  connectedProviders.has(provider)
                    ? undefined
                    : () => linkProvider(provider)
                }
                disabled={Boolean(linking) || connectedProviders.has(provider)}
              >
                <Text className="flex-1 text-base text-white">
                  {provider === 'apple' ? 'Apple' : 'Google'}
                </Text>
                <Text className="mr-3 text-gray-500 text-sm">
                  {connectedProviders.has(provider)
                    ? 'Connected'
                    : linking === provider
                      ? 'Linking…'
                      : 'Link'}
                </Text>
                {!connectedProviders.has(provider) && (
                  <Ionicons name="link-outline" size={20} color={iconColor} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <View className="mt-6">
        <Text className="px-4 pb-2 font-semibold text-white/60 text-xs">
          ACCOUNT INFORMATION
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <View className="h-12 flex-row items-center border-gray-800 border-b px-4">
            <Text className="flex-1 text-base text-white">Email</Text>
            <Text className="text-base text-gray-500">
              {user.email ?? 'Not set'}
            </Text>
          </View>

          <View className="h-12 flex-row items-center border-gray-800 border-b px-4">
            <Text className="flex-1 text-base text-white">Name</Text>
            <Text className="text-base text-gray-500">
              {user.name ?? 'Not set'}
            </Text>
          </View>

          <View className="h-12 flex-row items-center px-4">
            <Text className="flex-1 text-base text-white">Username</Text>
            <Text className="text-base text-gray-500">{username}</Text>
          </View>
        </View>
      </View>

      {/* Profile */}
      <View className="mt-6">
        <Text className="px-4 pb-2 font-semibold text-white/60 text-xs">
          PROFILE
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <View className="min-h-12 flex-row items-center border-gray-800 border-b px-4 py-3">
            <Text className="flex-1 text-base text-white">Bio</Text>
            <Text className="max-w-[60%] text-right text-base text-gray-500">
              {bio ?? 'Not set'}
            </Text>
          </View>

          <Pressable
            className="h-12 flex-row items-center px-4 opacity-50"
            disabled={true}
            accessibilityState={{ disabled: true }}
          >
            <Ionicons name="create-outline" size={24} color={iconColor} />
            <Text className="ml-3 flex-1 text-base text-white">
              Edit Profile
            </Text>
            <Text className="text-gray-500 text-sm">Coming soon</Text>
          </Pressable>
        </View>
      </View>

      {/* Security */}
      <View className="mt-6">
        <Text className="px-4 pb-2 font-semibold text-white/60 text-xs">
          SECURITY
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <Pressable
            className="h-12 flex-row items-center border-gray-800 border-b px-4 opacity-50"
            disabled={true}
            accessibilityState={{ disabled: true }}
          >
            <Ionicons name="lock-closed-outline" size={24} color={iconColor} />
            <Text className="ml-3 flex-1 text-base text-white">
              Change Password
            </Text>
            <Text className="text-gray-500 text-sm">Coming soon</Text>
          </Pressable>

          <Pressable
            className="h-12 flex-row items-center px-4"
            onPress={handleLogout}
            disabled={isLoggingOut}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="log-out-outline" size={24} color={iconColor} />
            <Text className="ml-3 flex-1 text-base text-white">
              {isLoggingOut ? 'Logging out...' : 'Log Out'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={iconColor} />
          </Pressable>
        </View>
      </View>

      {/* Danger Zone */}
      <View className="mt-6 pb-8">
        <Text className="px-4 pb-2 font-semibold text-white/60 text-xs">
          DANGER ZONE
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <Pressable
            className="h-14 flex-row items-center justify-center gap-3 px-4"
            onPress={handleDeleteAccount}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text className="font-semibold text-base text-red-500">
              Delete Account
            </Text>
          </Pressable>
        </View>
        <Text className="px-4 pt-2 text-gray-500 text-xs">
          This will permanently delete your account and all data. This action
          cannot be undone.
        </Text>
      </View>
    </ScrollView>
  );
}
