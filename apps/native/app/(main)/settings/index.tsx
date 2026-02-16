import { useCallback, useState } from 'react';

import { ActivityIndicator, Alert, View } from 'react-native';

import {
  Button as SwiftButton,
  Host,
  HStack,
  Image,
  Label,
  List,
  Section,
  Spacer,
  Text as SwiftText,
  VStack,
} from '@expo/ui/swift-ui';
import { foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';

import { router, useFocusEffect } from 'expo-router';

import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { showToast } from '@/lib/toast';

export default function SettingsScreen() {
  const preferences = useQuery(api.userPreferences.getPreferences);
  const resetToDefaults = useMutation(api.userPreferences.resetToDefaults);
  const [isResetting, setIsResetting] = useState(false);

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
    <Host style={{ flex: 1 }}>
      <List listStyle="insetGrouped">
        {/* ---- Profile ---- */}
        <Section title="PROFILE">
          <HStack
            spacing={12}
            onPress={() => router.push('./manage-account' as never)}
          >
            <Label
              title="Manage Account"
              systemImage="person.circle.fill"
              color="#007AFF"
            />
            <Spacer />
            <Image systemName="chevron.right" size={14} color="#8E8E93" />
          </HStack>
        </Section>

        {/* ---- Preferences ---- */}
        <Section title="PREFERENCES">
          {/* Appearance */}
          <HStack
            spacing={12}
            onPress={() => router.push('./appearance' as never)}
          >
            <Label
              title="Appearance"
              systemImage="paintbrush.fill"
              color="#FF9500"
            />
            <Spacer />
            <SwiftText
              color="#8E8E93"
              modifiers={[
                foregroundStyle({
                  type: 'hierarchical',
                  style: 'secondary',
                }),
              ]}
            >
              {themeLabel}
            </SwiftText>
            <Image systemName="chevron.right" size={14} color="#8E8E93" />
          </HStack>

          {/* Workout Settings */}
          <HStack
            spacing={12}
            onPress={() => router.push('./workout-settings' as never)}
          >
            <Label
              title="Workout Settings"
              systemImage="dumbbell.fill"
              color="#FF3B30"
            />
            <Spacer />
            <SwiftText color="#8E8E93">{workoutSummary}</SwiftText>
            <Image systemName="chevron.right" size={14} color="#8E8E93" />
          </HStack>

          {/* Integrations */}
          <HStack
            spacing={12}
            onPress={() => router.push('./integrations' as never)}
          >
            <Label
              title="Integrations"
              systemImage="link.circle.fill"
              color="#5856D6"
            />
            <Spacer />
            <Image systemName="chevron.right" size={14} color="#8E8E93" />
          </HStack>

          {/* Export & Import */}
          <HStack
            spacing={12}
            onPress={() => router.push('./export-import' as never)}
          >
            <Label
              title="Export & Import Data"
              systemImage="arrow.up.arrow.down.circle.fill"
              color="#34C759"
            />
            <Spacer />
            <Image systemName="chevron.right" size={14} color="#8E8E93" />
          </HStack>
        </Section>

        {/* ---- Reset ---- */}
        <Section>
          <VStack spacing={0} alignment="center">
            <SwiftButton
              role="destructive"
              variant="plain"
              disabled={isResetting}
              onPress={handleReset}
            >
              {isResetting ? 'Resetting…' : 'Reset All Settings to Defaults'}
            </SwiftButton>
          </VStack>
        </Section>
      </List>
    </Host>
  );
}
