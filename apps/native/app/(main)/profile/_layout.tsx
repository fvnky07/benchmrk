import { Pressable } from 'react-native';

import { Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';

import { useUserProfile } from '@/lib/hooks/use-user-profile';

/**
 * Profile tab layout
 *
 * Configures the Stack header with:
 * - Username as the title
 * - Share icon on the far right (placeholder)
 */
export default function ProfileLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { username } = useUserProfile();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? '#1c1c1e' : '#f2f2f7',
        },
        headerTintColor: isDark ? '#fff' : '#000',
        headerTitleStyle: {
          color: isDark ? '#fff' : '#000',
          fontWeight: '700',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: String(username),
          headerRight: () => (
            <Pressable
              onPress={() => {
                // TODO: Implement share functionality
              }}
              hitSlop={8}
            >
              <Feather
                name="share"
                size={22}
                color={isDark ? '#fff' : '#000'}
              />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
