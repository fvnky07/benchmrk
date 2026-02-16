import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import {
  Host,
  HStack,
  Label,
  List,
  Section,
  Spacer,
  Switch,
  Text as SwiftText,
  VStack,
} from '@expo/ui/swift-ui';

import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { showToast } from '@/lib/toast';

export default function IntegrationsScreen() {
  const preferences = useQuery(api.userPreferences.getPreferences);
  const updatePreferences = useMutation(
    api.userPreferences.updatePreferences
  );
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
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (preferences === null) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-gray-400">
          Sign in to manage integrations.
        </Text>
      </View>
    );
  }

  return (
    <Host style={{ flex: 1 }}>
      <List listStyle="insetGrouped">
        <Section title="HEALTH & FITNESS">
          <HStack spacing={12} alignment="center">
            <Label
              title="Apple Health"
              systemImage="heart.fill"
              color="#FF3B30"
            />
            <Spacer />
            <Switch
              value={preferences.appleHealthEnabled}
              onValueChange={(v) =>
                toggle('appleHealthEnabled', v, 'Apple Health')
              }
            />
          </HStack>

          <HStack spacing={12} alignment="center">
            <Label
              title="Strava"
              systemImage="figure.run"
              color="#FC4C02"
            />
            <Spacer />
            <Switch
              value={preferences.stravaEnabled}
              onValueChange={(v) =>
                toggle('stravaEnabled', v, 'Strava')
              }
            />
          </HStack>
        </Section>

        <Section title="COMING SOON">
          <VStack spacing={4}>
            <SwiftText size={14} color="#8E8E93">
              More integrations are on the way. Stay tuned!
            </SwiftText>
          </VStack>
        </Section>
      </List>
    </Host>
  );
}
