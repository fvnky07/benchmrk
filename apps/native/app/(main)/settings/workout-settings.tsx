import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  Host,
  HStack,
  Image,
  List,
  Section,
  Spacer,
  Switch,
  Text as SwiftText,
  VStack,
} from '@expo/ui/swift-ui';
import { padding } from '@expo/ui/swift-ui/modifiers';

import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { showToast } from '@/lib/toast';

const REST_TIMER_OPTIONS = [30, 60, 90, 120];

export default function WorkoutSettingsScreen() {
  const preferences = useQuery(api.userPreferences.getPreferences);
  const updatePreferences = useMutation(
    api.userPreferences.updatePreferences
  );
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
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (preferences === null) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-gray-400">
          Sign in to manage workout settings.
        </Text>
      </View>
    );
  }

  return (
    <Host style={{ flex: 1 }}>
      <List listStyle="insetGrouped">
        {/* ---- General ---- */}
        <Section title="GENERAL">
          {/* Rest Timer */}
          <VStack spacing={8} alignment="leading">
            <SwiftText weight="semibold">Default Rest Timer</SwiftText>
            <HStack spacing={8}>
              {REST_TIMER_OPTIONS.map((secs) => {
                const selected =
                  preferences.defaultRestTimer === secs;
                return (
                  <HStack
                    key={secs}
                    spacing={4}
                    onPress={() =>
                      save(
                        'defaultRestTimer',
                        secs,
                        () => analytics.restTimerChanged(secs)
                      )
                    }
                  >
                    <SwiftText
                      weight={selected ? 'bold' : 'regular'}
                      color={selected ? '#007AFF' : '#8E8E93'}
                    >
                      {`${secs}s`}
                    </SwiftText>
                    {selected && (
                      <Image
                        systemName="checkmark.circle.fill"
                        size={14}
                        color="#007AFF"
                      />
                    )}
                  </HStack>
                );
              })}
            </HStack>
          </VStack>

          {/* Weight Unit */}
          <HStack spacing={0} modifiers={[padding({ vertical: 8 })]}>
            <SwiftText weight="semibold">Weight Unit</SwiftText>
            <Spacer />
            <HStack spacing={12}>
              {(['kg', 'lbs'] as const).map((unit) => {
                const selected = preferences.weightUnit === unit;
                return (
                  <HStack
                    key={unit}
                    spacing={4}
                    onPress={() =>
                      save(
                        'weightUnit',
                        unit,
                        () => analytics.weightUnitChanged(unit)
                      )
                    }
                  >
                    <SwiftText
                      weight={selected ? 'bold' : 'regular'}
                      color={selected ? '#007AFF' : '#8E8E93'}
                    >
                      {unit.toUpperCase()}
                    </SwiftText>
                    {selected && (
                      <Image
                        systemName="checkmark.circle.fill"
                        size={14}
                        color="#007AFF"
                      />
                    )}
                  </HStack>
                );
              })}
            </HStack>
          </HStack>
        </Section>

        {/* ---- Tracking ---- */}
        <Section title="TRACKING">
          <HStack spacing={0} alignment="center" modifiers={[padding({ vertical: 8 })]}>
            <VStack spacing={2} alignment="leading">
              <SwiftText weight="semibold">
                Auto-save Workouts
              </SwiftText>
              <SwiftText size={13} color="#8E8E93">
                Save automatically after completion
              </SwiftText>
            </VStack>
            <Spacer />
            <Switch
              value={preferences.autoSaveWorkouts}
              onValueChange={(v) =>
                save('autoSaveWorkouts', v, () =>
                  analytics.autoSaveToggled(v)
                )
              }
            />
          </HStack>

          <HStack spacing={0} alignment="center" modifiers={[padding({ vertical: 8 })]}>
            <VStack spacing={2} alignment="leading">
              <SwiftText weight="semibold">Sync to Cloud</SwiftText>
              <SwiftText size={13} color="#8E8E93">
                Backup workouts to your account
              </SwiftText>
            </VStack>
            <Spacer />
            <Switch
              value={preferences.syncToCloud}
              onValueChange={(v) =>
                save('syncToCloud', v, () =>
                  analytics.syncToggled(v)
                )
              }
            />
          </HStack>
        </Section>
      </List>
    </Host>
  );
}
