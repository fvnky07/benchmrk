import { Host, Toggle } from '@expo/ui/swift-ui';
import { tint } from '@expo/ui/swift-ui/modifiers';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { showToast } from '@/lib/ui';

const iconColor = '#00ff90';

export default function IntegrationsScreen() {
  const preferences = useQuery(api.userPreferences.getPreferences);
  const updatePreferences = useMutation(api.userPreferences.updatePreferences);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('integrations');
    }, [])
  );

  const toggle = async (
    key: 'appleHealthEnabled' | 'stravaEnabled',
    value: boolean,
    name: string
  ) => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      await updatePreferences({ [key]: value });
      analytics.integrationToggled(name, value);
    } catch {
      showToast.error('Failed', `Could not toggle ${name}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (preferences === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1">
        <ActivityIndicator size="large" color={iconColor} />
        <Text className="mt-4 text-gray-400">Loading integrations…</Text>
      </View>
    );
  }

  if (preferences === null) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1">
        <Text className="text-gray-400">Sign in to manage integrations.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-black-1">
      {/* Health & Fitness */}
      <View className="mt-6">
        <Text className="px-4 pb-2 font-semibold text-white/60 text-xs">
          HEALTH & FITNESS
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <View className="h-16 flex-row items-center border-gray-800 border-b px-4">
            <Ionicons name="heart" size={24} color="#FF3B30" />
            <View className="ml-3 flex-1">
              <Text className="text-base text-white">Apple Health</Text>
              <Text className="text-gray-500 text-xs">
                Sync workouts to Apple Health
              </Text>
            </View>
            <Host matchContents>
              <Toggle
                isOn={preferences.appleHealthEnabled}
                onIsOnChange={(isOn) =>
                  toggle('appleHealthEnabled', isOn, 'Apple Health')
                }
                modifiers={[tint(iconColor)]}
              />
            </Host>
          </View>

          <View className="h-16 flex-row items-center px-4">
            <Ionicons name="bicycle" size={24} color="#FC4C02" />
            <View className="ml-3 flex-1">
              <Text className="text-base text-white">Strava</Text>
              <Text className="text-gray-500 text-xs">
                Export activities to Strava
              </Text>
            </View>
            <Host matchContents>
              <Toggle
                isOn={preferences.stravaEnabled}
                onIsOnChange={(isOn) => toggle('stravaEnabled', isOn, 'Strava')}
                modifiers={[tint(iconColor)]}
              />
            </Host>
          </View>
        </View>
      </View>

      {/* Coming Soon */}
      <View className="mt-6 pb-8">
        <Text className="px-4 pb-2 font-semibold text-white/60 text-xs">
          COMING SOON
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E] p-4">
          <Text className="text-gray-400 text-sm">
            More integrations are on the way. Stay tuned!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
