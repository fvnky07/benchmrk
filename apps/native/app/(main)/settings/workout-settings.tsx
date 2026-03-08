import { Host, Picker, Switch } from '@expo/ui/swift-ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { showToast } from '@/lib/ui';

const REST_TIMER_OPTIONS = [30, 60, 90, 120];
const WEIGHT_UNITS = ['kg', 'lbs'] as const;
const iconColor = '#00ff90';

export default function WorkoutSettingsScreen() {
  const preferences = useQuery(api.userPreferences.getPreferences);
  const updatePreferences = useMutation(api.userPreferences.updatePreferences);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('workout_settings');
    }, [])
  );

  const save = async (
    key: string,
    value: number | boolean | string,
    trackFn: () => void
  ) => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      await updatePreferences({ [key]: value });
      trackFn();
    } catch {
      showToast.error('Failed', 'Could not save preference');
    } finally {
      setIsSaving(false);
    }
  };

  if (preferences === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1">
        <ActivityIndicator size="large" color={iconColor} />
        <Text className="mt-4 text-gray-400">Loading workout settings…</Text>
      </View>
    );
  }

  if (preferences === null) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1">
        <Text className="text-gray-400">
          Sign in to manage workout settings.
        </Text>
      </View>
    );
  }

  const restTimerIndex = REST_TIMER_OPTIONS.indexOf(
    preferences.defaultRestTimer
  );
  const weightUnitIndex = WEIGHT_UNITS.indexOf(preferences.weightUnit);

  return (
    <ScrollView className="flex-1 bg-black-1">
      {/* Rest Timer */}
      <View className="mt-6">
        <Text className="px-4 pb-2 font-semibold text-white/60 text-xs">
          DEFAULT REST TIMER
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <Host matchContents>
            <Picker
              options={REST_TIMER_OPTIONS.map((s) => `${s}s`)}
              selectedIndex={restTimerIndex}
              onOptionSelected={({ nativeEvent: { index } }) => {
                save('defaultRestTimer', REST_TIMER_OPTIONS[index], () =>
                  analytics.restTimerChanged(REST_TIMER_OPTIONS[index])
                );
              }}
              variant="segmented"
            />
          </Host>
        </View>
      </View>

      {/* Weight Unit */}
      <View className="mt-6">
        <Text className="px-4 pb-2 font-semibold text-white/60 text-xs">
          WEIGHT UNIT
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <Host matchContents>
            <Picker
              options={WEIGHT_UNITS.map((u) => u.toUpperCase())}
              selectedIndex={weightUnitIndex}
              onOptionSelected={({ nativeEvent: { index } }) => {
                save('weightUnit', WEIGHT_UNITS[index], () =>
                  analytics.weightUnitChanged(WEIGHT_UNITS[index])
                );
              }}
              variant="segmented"
            />
          </Host>
        </View>
      </View>

      {/* Tracking */}
      <View className="mt-6 pb-8">
        <Text className="px-4 pb-2 font-semibold text-white/60 text-xs">
          TRACKING
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <View className="h-16 flex-row items-center border-gray-800 border-b px-4">
            <View className="flex-1">
              <Text className="text-base text-white">Auto-save Workouts</Text>
              <Text className="text-gray-500 text-xs">
                Save automatically after completion
              </Text>
            </View>
            <Host matchContents>
              <Switch
                value={preferences.autoSaveWorkouts}
                onValueChange={(v) =>
                  save('autoSaveWorkouts', v, () =>
                    analytics.autoSaveToggled(v)
                  )
                }
                color={iconColor}
                variant="switch"
              />
            </Host>
          </View>

          <View className="h-16 flex-row items-center px-4">
            <View className="flex-1">
              <Text className="text-base text-white">Sync to Cloud</Text>
              <Text className="text-gray-500 text-xs">
                Backup workouts to your account
              </Text>
            </View>
            <Host matchContents>
              <Switch
                value={preferences.syncToCloud}
                onValueChange={(v) =>
                  save('syncToCloud', v, () => analytics.syncToggled(v))
                }
                color={iconColor}
                variant="switch"
              />
            </Host>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
