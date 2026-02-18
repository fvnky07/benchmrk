import { useState } from 'react';

import { Alert, Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

import { router, Stack } from 'expo-router';

import { authClient } from '@/lib';

function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await authClient.signOut();
            router.replace('/');
          } catch {
            Alert.alert('Error', 'Failed to log out. Please try again.');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <Pressable
      onPress={handleLogout}
      className="flex items-center justify-center pl-1.5"
      disabled={isLoggingOut}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Ionicons name="log-out-outline" size={28} color="#fff" />
    </Pressable>
  );
}

export default function SettingsLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#151515' },
        headerTitleStyle: {
          color: isDark ? '#fff' : '#000',
          fontWeight: '700',
          fontSize: 22,
        },

        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen
        name="manage-account"
        options={{
          title: 'Manage Account',
          headerRight: () => <LogoutButton />,
        }}
      />
      <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
      <Stack.Screen
        name="workout-settings"
        options={{ title: 'Workout Settings' }}
      />
      <Stack.Screen name="integrations" options={{ title: 'Integrations' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen
        name="export-import"
        options={{ title: 'Export & Import' }}
      />
    </Stack>
  );
}
