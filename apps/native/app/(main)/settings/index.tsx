import { Ionicons } from '@expo/vector-icons';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import { SettingsRow } from '@/components/settings/SettingsRow';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
        <Text className="mb-2 font-semibold text-lg text-white">
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
    <ScrollView className="flex-1 bg-black-1">
      <View className="mt-6">
        <View className="mx-4 overflow-hidden rounded-xl bg-green-1">
          <Pressable
            className="my-2 h-14 flex-row items-center justify-center px-4"
            onPress={() => router.push('/(main)/settings/manage-account')}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text className="text-4xl text-black">benchmrk pro</Text>
          </Pressable>
        </View>
      </View>
      <View className="mt-6">
        <Text className="px-4 pb-2 font-semibold text-white/60 text-xs">
          PROFILE
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-black-3">
          <Pressable
            className="my-2 h-14 flex-row items-center px-4"
            onPress={() => router.push('/(main)/settings/manage-account')}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Avatar className="size-10 rounded-lg" alt={`${username}'s avatar`}>
              {avatarUrl ? <AvatarImage source={{ uri: avatarUrl }} /> : null}
              <AvatarFallback>
                <Text className="font-semibold text-foreground text-lg">
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
          </Pressable>
          {/* Export & Import */}
          <SettingsRow
            icon="swap-vertical"
            iconColor={iconColour}
            label="Export & Import Data"
            onPress={() => router.push('/(main)/settings/export-import')}
            hasBorder={false}
          />
          {/* Integrations */}
          <SettingsRow
            icon="link-outline"
            iconColor={iconColour}
            label="Integrations"
            onPress={() => router.push('/(main)/settings/integrations')}
            hasBorder={true}
          />
        </View>
      </View>

      {/* Preferences Section */}
      <View className="mt-6">
        <Text className="px-4 pb-2 font-semibold text-white/60 text-xs">
          PREFERENCES
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          {/* Appearance */}
          <SettingsRow
            icon="color-palette-outline"
            iconColor={iconColour}
            label="Appearance"
            rightLabel={themeLabel}
            onPress={() => router.push('/(main)/settings/appearance')}
            hasBorder={true}
          />

          {/* Workout Settings */}
          <SettingsRow
            icon="barbell-outline"
            iconColor={iconColour}
            label="Workout Settings"
            rightLabel={workoutSummary}
            onPress={() => router.push('/(main)/settings/workout-settings')}
            hasBorder={true}
          />

          {/* Notifications */}
          <SettingsRow
            icon="notifications-outline"
            iconColor={iconColour}
            label="Notifications"
            onPress={() => router.push('/(main)/settings/integrations')}
            hasBorder={true}
          />
        </View>
      </View>

      {/* Reset Section */}
      <View className="mt-6 pb-8">
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <Pressable
            className="h-12 flex-row items-center justify-center gap-4 px-4"
            onPress={handleReset}
            disabled={isResetting}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="reload" size={18} color="#ef4444" />
            <Text className="font-semibold text-base text-red-500">
              {isResetting ? 'Resetting…' : 'Reset All Settings to Defaults'}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
