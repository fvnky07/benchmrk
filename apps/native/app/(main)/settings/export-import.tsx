import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';

const iconColor = '#00ff90';

export default function ExportImportScreen() {
  useFocusEffect(
    useCallback(() => {
      analytics.settingsScreenViewed('export_import');
    }, [])
  );

  const handleExport = () => {
    console.log('Export All Data - Coming soon');
  };

  const handleImport = () => {
    console.log('Import Data - Coming soon');
  };

  return (
    <ScrollView className="flex-1 bg-black-1">
      {/* Export Section */}
      <View className="mt-6">
        <Text className="px-4 pb-2 font-semibold text-white/60 text-xs">
          EXPORT
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <Pressable
            className="h-14 flex-row items-center px-4"
            onPress={handleExport}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="#007AFF" />
            <View className="ml-3 flex-1">
              <Text className="text-base text-white">Export All Data</Text>
            </View>
            <Text className="text-gray-500 text-sm">Coming soon</Text>
          </Pressable>

          <View className="border-gray-800 border-t px-4 py-3">
            <Text className="text-gray-400 text-xs leading-5">
              Export your workout history, settings, and profile as a JSON or
              CSV file.
            </Text>
          </View>
        </View>
      </View>

      {/* Import Section */}
      <View className="mt-6 pb-8">
        <Text className="px-4 pb-2 font-semibold text-white/60 text-xs">
          IMPORT
        </Text>
        <View className="mx-4 overflow-hidden rounded-xl bg-[#1C1C1E]">
          <Pressable
            className="h-14 flex-row items-center px-4"
            onPress={handleImport}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons
              name="cloud-download-outline"
              size={24}
              color={iconColor}
            />
            <View className="ml-3 flex-1">
              <Text className="text-base text-white">Import Data</Text>
            </View>
            <Text className="text-gray-500 text-sm">Coming soon</Text>
          </Pressable>

          <View className="border-gray-800 border-t px-4 py-3">
            <Text className="text-gray-400 text-xs leading-5">
              Restore data from a previous export file.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
