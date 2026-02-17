import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';

import { router, useFocusEffect } from 'expo-router';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { authClient } from '@/lib/auth';
import { showToast } from '@/lib/ui';

export default function SettingsScreen() {
  const preferences = useQuery(api.userPreferences.getPreferences);
  const resetToDefaults = useMutation(api.userPreferences.resetToDefaults);
  const [isResetting, setIsResetting] = useState(false);

  const session = authClient.useSession();
  const user = session.data?.user;
  const userData = user as Record<string, unknown> | undefined;

  const username =
    (userData?.displayUsername as string) ??
    (userData?.username as string) ??
    user?.name ??
    'User';

  const avatarUrl = (user?.image as string) ?? null;
  const initials = username.slice(0, 2).toUpperCase();

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('settings_main');
    }, [])
  );

  const handleReset = () => {
    Alert.alert(
      'Reset Settings',
      'This will restore all preferences to their defaults. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsResetting(true);
              await resetToDefaults();
              analytics.preferencesReset();
              showToast.success('Settings reset', 'Defaults restored');
            } catch {
              showToast.error('Failed', 'Could not reset settings');
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  };

  // ----- loading -----
  if (preferences === undefined) {
    return (
      <View className="bg-black flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-4 text-gray-400">Loading settings…</Text>
      </View>
    );
  }

  // ----- error (null = unauthenticated) -----
  if (preferences === null) {
    return (
      <View className="bg-black flex-1 items-center justify-center px-6">
        <Text className="mb-2 text-lg font-semibold text-white">
          Unable to load settings
        </Text>
        <Text className="text-center text-gray-400">
          Please sign in to access your preferences.
        </Text>
      </View>
    );
  }

  const themeLabel =
    preferences.theme === 'system'
      ? 'System'
      : preferences.theme === 'light'
        ? 'Light'
        : 'Dark';

  const workoutSummary = `Rest ${preferences.defaultRestTimer}s · ${preferences.weightUnit.toUpperCase()}`;

  return (
    <ScrollView className="flex-1 bg-[#000000]">
      {/* Profile Section */}
      <View className="mt-6">
        <Text className="px-4 pb-2 text-xs font-semibold text-gray-500">
          PROFILE
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <TouchableOpacity
            className="h-18 flex-row items-center px-4"
            onPress={() => router.push('./manage-account' as never)}
            activeOpacity={0.7}
          >
            <Avatar className="size-20 rounded-md" alt={`${username}'s avatar`}>
              {avatarUrl ? <AvatarImage source={{ uri: avatarUrl }} /> : null}
              <AvatarFallback>
                <Text className="text-lg font-semibold text-foreground">
                  {initials}
                </Text>
              </AvatarFallback>
            </Avatar>
            <Text className="ml-3 flex-1 text-base text-white">
              Manage Account
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </TouchableOpacity>
          <TouchableOpacity
            className="h-12 flex-row items-center px-4"
            onPress={() => router.push('./manage-account' as never)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle" size={28} color="#007AFF" />
            <Text className="ml-3 flex-1 text-base text-white">
              Manage Account
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </TouchableOpacity>
          <TouchableOpacity
            className="h-12 flex-row items-center px-4"
            onPress={() => router.push('./manage-account' as never)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle" size={28} color="#007AFF" />
            <Text className="ml-3 flex-1 text-base text-white">
              Manage Account
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Preferences Section */}
      <View className="mt-6">
        <Text className="px-4 pb-2 text-xs font-semibold text-gray-500">
          PREFERENCES
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          {/* Appearance */}
          <TouchableOpacity
            className="h-12 flex-row items-center border-b border-gray-800 px-4"
            onPress={() => router.push('./appearance' as never)}
            activeOpacity={0.7}
          >
            <Ionicons name="brush" size={28} color="#FF9500" />
            <Text className="ml-3 flex-1 text-base text-white">Appearance</Text>
            <Text className="mr-2 text-base text-gray-500">{themeLabel}</Text>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </TouchableOpacity>

          {/* Workout Settings */}
          <TouchableOpacity
            className="h-12 flex-row items-center border-b border-gray-800 px-4"
            onPress={() => router.push('./workout-settings' as never)}
            activeOpacity={0.7}
          >
            <Ionicons name="barbell" size={28} color="#FF3B30" />
            <Text className="ml-3 flex-1 text-base text-white">
              Workout Settings
            </Text>
            <Text className="mr-2 text-base text-gray-500">
              {workoutSummary}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </TouchableOpacity>

          {/* Integrations */}
          <TouchableOpacity
            className="h-12 flex-row items-center border-b border-gray-800 px-4"
            onPress={() => router.push('./integrations' as never)}
            activeOpacity={0.7}
          >
            <Ionicons name="link-outline" size={28} color="#5856D6" />
            <Text className="ml-3 flex-1 text-base text-white">
              Integrations
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </TouchableOpacity>

          {/* Export & Import */}
          <TouchableOpacity
            className="h-12 flex-row items-center px-4"
            onPress={() => router.push('./export-import' as never)}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-vertical" size={28} color="#34C759" />
            <Text className="ml-3 flex-1 text-base text-white">
              Export & Import Data
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Reset Section */}
      <View className="mt-6 pb-8">
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <TouchableOpacity
            className="h-12 items-center justify-center px-4"
            onPress={handleReset}
            disabled={isResetting}
            activeOpacity={0.7}
          >
            <Text className="text-base font-semibold text-[#FF3B30]">
              {isResetting ? 'Resetting…' : 'Reset All Settings to Defaults'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
