import { useCallback } from 'react';

import { ActivityIndicator, Alert, View, ScrollView, TouchableOpacity } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useFocusEffect } from 'expo-router';

import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { authClient } from '@/lib/auth';
import { useUserProfile } from '@/lib/hooks/use-user-profile';

const iconColor = '#00ff90';

export default function ManageAccountScreen() {
  const { user, username, bio } = useUserProfile();

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('manage_account');
    }, [])
  );

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
            } catch {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const handleChangePassword = () => {
    console.log('Change password - Coming soon');
  };

  const handleEditProfile = () => {
    console.log('Edit profile - Coming soon');
  };

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1">
        <ActivityIndicator size="large" color={iconColor} />
        <Text className="mt-4 text-gray-400">Loading account…</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-black-1">
      {/* Account Information */}
      <View className="mt-6">
        <Text className="px-4 pb-2 text-xs font-semibold text-white/60">
          ACCOUNT INFORMATION
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <View className="h-12 flex-row items-center border-b border-gray-800 px-4">
            <Text className="flex-1 text-base text-white">Email</Text>
            <Text className="text-base text-gray-500">{user.email ?? 'Not set'}</Text>
          </View>

          <View className="h-12 flex-row items-center border-b border-gray-800 px-4">
            <Text className="flex-1 text-base text-white">Name</Text>
            <Text className="text-base text-gray-500">{user.name ?? 'Not set'}</Text>
          </View>

          <View className="h-12 flex-row items-center px-4">
            <Text className="flex-1 text-base text-white">Username</Text>
            <Text className="text-base text-gray-500">{username}</Text>
          </View>
        </View>
      </View>

      {/* Profile */}
      <View className="mt-6">
        <Text className="px-4 pb-2 text-xs font-semibold text-white/60">PROFILE</Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <View className="min-h-12 flex-row items-center border-b border-gray-800 px-4 py-3">
            <Text className="flex-1 text-base text-white">Bio</Text>
            <Text className="max-w-[60%] text-right text-base text-gray-500">
              {bio ?? 'Not set'}
            </Text>
          </View>

          <TouchableOpacity
            className="h-12 flex-row items-center px-4"
            onPress={handleEditProfile}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={24} color={iconColor} />
            <Text className="ml-3 flex-1 text-base text-white">Edit Profile</Text>
            <Ionicons name="chevron-forward" size={18} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Security */}
      <View className="mt-6">
        <Text className="px-4 pb-2 text-xs font-semibold text-white/60">SECURITY</Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <TouchableOpacity
            className="h-12 flex-row items-center px-4"
            onPress={handleChangePassword}
            activeOpacity={0.7}
          >
            <Ionicons name="lock-closed-outline" size={24} color={iconColor} />
            <Text className="ml-3 flex-1 text-base text-white">Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Danger Zone */}
      <View className="mt-6 pb-8">
        <Text className="px-4 pb-2 text-xs font-semibold text-white/60">DANGER ZONE</Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <TouchableOpacity
            className="h-14 flex-row items-center justify-center gap-3 px-4"
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
            <Text className="text-base font-semibold text-red-500">Delete Account</Text>
          </TouchableOpacity>
        </View>
        <Text className="px-4 pt-2 text-xs text-gray-500">
          This will permanently delete your account and all data. This action cannot be undone.
        </Text>
      </View>
    </ScrollView>
  );
}
