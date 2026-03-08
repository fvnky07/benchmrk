import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';

const iconColor = '#00ff90';

export default function NotificationsScreen() {
  const preferences = useQuery(api.userPreferences.getPreferences);
  // const updatePreferences = useMutation(api.userPreferences.updatePreferences);
  // const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('integrations');
    }, [])
  );

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
