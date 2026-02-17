import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import {
  Host,
  HStack,
  Image,
  List,
  Section,
  Spacer,
  Text as SwiftText,
} from '@expo/ui/swift-ui';
import { padding } from '@expo/ui/swift-ui/modifiers';

import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { showToast } from '@/lib/ui';

type Theme = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System Default' },
];

export default function AppearanceScreen() {
  const systemScheme = useColorScheme();
  const preferences = useQuery(api.userPreferences.getPreferences);
  const updatePreferences = useMutation(api.userPreferences.updatePreferences);
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('appearance');
    }, [])
  );

  const handleSelect = async (theme: Theme) => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      await updatePreferences({ theme });
      analytics.themeChanged(theme);
    } catch {
      showToast.error('Failed', 'Could not save theme preference');
    } finally {
      setIsSaving(false);
    }
  };

  if (preferences === undefined) {
    return (
      <View className="bg-black flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (preferences === null) {
    return (
      <View className="bg-black flex-1 items-center justify-center">
        <Text className="text-gray-400">Sign in to manage appearance.</Text>
      </View>
    );
  }

  const currentTheme = preferences.theme ?? 'system';

  return (
    <Host style={{ flex: 1 }}>
      <List listStyle="insetGrouped">
        <Section title="THEME">
          {THEME_OPTIONS.map((opt) => {
            const selected = currentTheme === opt.value;
            return (
              <HStack
                key={opt.value}
                spacing={0}
                onPress={() => handleSelect(opt.value)}
                modifiers={[padding({ vertical: 8 })]}
              >
                <SwiftText weight={selected ? 'semibold' : 'regular'}>
                  {opt.label}
                </SwiftText>
                <Spacer />
                {selected && (
                  <Image systemName="checkmark" size={16} color="#007AFF" />
                )}
              </HStack>
            );
          })}
        </Section>

        <Section>
          <SwiftText size={13} color="#8E8E93">
            {`Your system is currently using ${systemScheme ?? 'light'} mode. Choosing "System Default" will follow this automatically.`}
          </SwiftText>
        </Section>
      </List>
    </Host>
  );
}
