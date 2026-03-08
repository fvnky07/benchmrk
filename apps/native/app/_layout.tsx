import '../global.css';

import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { ConvexReactClient } from 'convex/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { PostHogProvider } from 'posthog-react-native';
import { useEffect } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { SplashScreen } from '@/components/SplashScreen';
import { identifyUser, resetAnalytics } from '@/lib/analytics';
import { authClient, useAuth } from '@/lib/auth';
import { NAV_THEME, toastConfig } from '@/lib/ui';

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string,
  {
    // Optionally pause queries until the user is authenticated
    expectAuth: true,
    unsavedChangesWarning: false,
  }
);

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      identifyUser(user.id, {
        email: user.email ?? '',
        name: user.name ?? '',
      });
    } else if (!isAuthenticated && !isLoading) {
      resetAnalytics();
    }
  }, [isAuthenticated, isLoading, user]);

  // Show splash screen while determining auth state
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <PostHogProvider
        apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY!}
        options={{
          host: process.env.EXPO_PUBLIC_POSTHOG_HOST!,
        }}
      >
        <SafeAreaProvider>
          <KeyboardProvider>
            <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
              <Stack screenOptions={{ headerShown: false }}>
                {/* Protected routes - only accessible when authenticated */}
                <Stack.Protected guard={isAuthenticated}>
                  <Stack.Screen name="(main)" />
                </Stack.Protected>
                {/* Public routes - only accessible when NOT authenticated */}
                <Stack.Protected guard={!isAuthenticated}>
                  <Stack.Screen name="(auth)" />
                </Stack.Protected>
              </Stack>
              <PortalHost />
              <Toast config={toastConfig} />
            </ThemeProvider>
          </KeyboardProvider>
        </SafeAreaProvider>
      </PostHogProvider>
    </ConvexBetterAuthProvider>
  );
}
