import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  useColorScheme,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';

import { useFocusEffect } from 'expo-router';

import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { showToast } from '@/lib/ui';

type Theme = 'light' | 'dark' | 'system';

const THEME_OPTIONS: {
  value: Theme;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

const iconColor = '#00ff90';

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
      showToast.success('Theme updated', `Changed to ${theme} mode`);
    } catch {
      showToast.error('Failed', 'Could not save theme preference');
    } finally {
      setIsSaving(false);
    }
  };

  if (preferences === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1">
        <ActivityIndicator size="large" color={iconColor} />
        <Text className="mt-4 text-gray-400">Loading theme settings…</Text>
      </View>
    );
  }

  if (preferences === null) {
    return (
      <View className="flex-1 items-center justify-center bg-black-1">
        <Text className="text-gray-400">Sign in to manage appearance.</Text>
      </View>
    );
  }

  const currentTheme = preferences.theme ?? 'system';

  return (
    <ScrollView className="flex-1 bg-black-1">
      {/* Theme Options */}
      <View className="mt-6">
        <Text className="px-4 pb-2 text-xs font-semibold text-white/60">
          THEME
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          {THEME_OPTIONS.map((option, index) => {
            const selected = currentTheme === option.value;
            const isLast = index === THEME_OPTIONS.length - 1;

            return (
              <TouchableOpacity
                key={option.value}
                className={`h-12 flex-row items-center px-4 ${isLast ? '' : 'border-b border-gray-800'}`}
                onPress={() => handleSelect(option.value)}
                activeOpacity={0.7}
                disabled={isSaving}
              >
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={selected ? iconColor : '#8E8E93'}
                />
                <Text className={`ml-3 flex-1 text-base ${selected ? 'font-semibold text-white' : 'text-white'}`}>
                  {option.label}
                </Text>
                {selected && (
                  <Ionicons name="checkmark-circle" size={20} color={iconColor} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Info Section */}
      <View className="mt-6 pb-8">
        <Text className="px-4 pb-2 text-xs font-semibold text-white/60">INFORMATION</Text>
        <View className="mx-4 rounded-xl bg-[#1C1C1E] p-4">
          <Text className="text-sm leading-5 text-gray-400">
            Your system is currently using <Text className="text-white">{systemScheme ?? 'light'}</Text> mode. 
            {'\n\n'}
            Choosing &quot;System Default&quot; will automatically follow your device&apos;s appearance settings.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
