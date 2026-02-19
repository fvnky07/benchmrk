import { Pressable } from 'react-native';

import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

import { Stack } from 'expo-router';

import { useUserProfile } from '@/lib/hooks/use-user-profile';

export default function ProfileLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { username } = useUserProfile();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? '#151515' : '#f2f2f7',
        },
        headerTintColor: isDark ? '#fff' : '#000',
        headerTitleStyle: {
          color: isDark ? '#fff' : '#000',
          fontWeight: '700',
          fontSize: 22,
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
                className="pl-1.5"
                size={24}
                color={isDark ? '#fff' : '#000'}
              />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
