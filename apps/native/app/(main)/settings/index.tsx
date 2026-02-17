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
import { useUserProfile } from '@/lib';
import { analytics } from '@/lib/analytics';
import { showToast } from '@/lib/ui';

export default function SettingsScreen() {
  const preferences = useQuery(api.userPreferences.getPreferences);
  const resetToDefaults = useMutation(api.userPreferences.resetToDefaults);
  const [isResetting, setIsResetting] = useState(false);

  const { username, avatarUrl, initials } = useUserProfile();
  const iconColour = '#00ff90';

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
      <View className="flex-1 items-center justify-center bg-black-1">
        <ActivityIndicator size="large" color={iconColour} />
        <Text className="mt-4 text-gray-400">Loading settings…</Text>
      </View>
    );
  }

  // ----- error (null = unauthenticated) -----
  if (preferences === null) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1 px-6">
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
      : (preferences.theme === 'light'
        ? 'Light'
        : 'Dark');

  const workoutSummary = `Rest ${preferences.defaultRestTimer}s · ${preferences.weightUnit.toUpperCase()}`;

  return (
    <ScrollView className="flex-1 bg-black-1">
      <View className="mt-6">
        <View className="mx-4 overflow-hidden rounded-xl bg-green-1">
          <TouchableOpacity
            className="my-2 h-14 flex-row items-center justify-center px-4"
            onPress={() => router.push('/(main)/settings/manage-account')}
            activeOpacity={0.7}
          >
            <Text className="text-black text-4xl">benchmrk pro</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View className="mt-6">
        <Text className="px-4 pb-2 text-xs font-semibold text-white/60">
          PROFILE
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-black-3">
          <TouchableOpacity
            className="my-2 h-14 flex-row items-center px-4"
            onPress={() => router.push('/(main)/settings/manage-account')}
            activeOpacity={0.7}
          >
            <Avatar className="size-10 rounded-lg" alt={`${username}'s avatar`}>
              {avatarUrl ? <AvatarImage source={{ uri: avatarUrl }} /> : null}
              <AvatarFallback>
                <Text className="text-lg font-semibold text-foreground">
                  {initials}
                </Text>
              </AvatarFallback>
            </Avatar>
            <View className="flex-1 flex-col">
              <Text className="ml-3 text-base text-white">Manage Account</Text>
              <Text className="ml-3 text-sm text-white/60">
                Apple ID, Change email, edit profile
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={iconColour} />
          </TouchableOpacity>
          {/* Export & Import */}
          <TouchableOpacity
            className="h-12 flex-row items-center px-4"
            onPress={() => router.push('/(main)/settings/export-import')}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-vertical" size={28} color={iconColour} />
            <Text className="ml-3 flex-1 text-base text-white">
              Export & Import Data
            </Text>
            <Ionicons name="chevron-forward" size={18} color={iconColour} />
          </TouchableOpacity>
          {/* Notifications */}
          <TouchableOpacity
            className="h-12 flex-row items-center border-b border-gray-800 px-4"
            onPress={() => router.push('/(main)/settings/integrations')}
            activeOpacity={0.7}
          >
            <Ionicons name="link-outline" size={28} color={iconColour} />
            <Text className="ml-3 flex-1 text-base text-white">
              Integrations
            </Text>
            <Ionicons name="chevron-forward" size={18} color={iconColour} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Preferences Section */}
      <View className="mt-6">
        <Text className="px-4 pb-2 text-xs font-semibold text-white/60">
          PREFERENCES
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          {/* Appearance */}
          <TouchableOpacity
            className="h-12 flex-row items-center border-b border-gray-800 px-4"
            onPress={() => router.push('/(main)/settings/appearance')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="color-palette-outline"
              size={28}
              color={iconColour}
            />
            <Text className="ml-3 flex-1 text-base text-white">Appearance</Text>
            <Text className="mr-2 text-base text-gray-500">{themeLabel}</Text>
            <Ionicons name="chevron-forward" size={18} color={iconColour} />
          </TouchableOpacity>

          {/* Workout Settings */}
          <TouchableOpacity
            className="h-12 flex-row items-center border-b border-gray-800 px-4"
            onPress={() => router.push('/(main)/settings/workout-settings')}
            activeOpacity={0.7}
          >
            <Ionicons name="barbell-outline" size={28} color={iconColour} />
            <Text className="ml-3 flex-1 text-base text-white">
              Workout Settings
            </Text>
            <Text className="mr-2 text-base text-gray-500">
              {workoutSummary}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={iconColour} />
          </TouchableOpacity>

          {/* Integrations */}
          <TouchableOpacity
            className="h-12 flex-row items-center border-b border-gray-800 px-4"
            onPress={() => router.push('/(main)/settings/integrations')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="notifications-outline"
              size={28}
              color={iconColour}
            />
            <Text className="ml-3 flex-1 text-base text-white">
              Notifications
            </Text>
            <Ionicons name="chevron-forward" size={18} color={iconColour} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Reset Section */}
      <View className="mt-6 pb-8">
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <TouchableOpacity
            className="h-12 flex-row items-center justify-center gap-4 px-4"
            onPress={handleReset}
            disabled={isResetting}
            activeOpacity={0.7}
          >
            <Ionicons name="reload" size={18} color="#ef4444" />
            <Text className="text-base font-semibold text-red-500">
              {isResetting ? 'Resetting…' : 'Reset All Settings to Defaults'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
