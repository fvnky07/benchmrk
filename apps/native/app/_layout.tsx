import {
  type AuthClient as ConvexAuthClient,
  ConvexBetterAuthProvider,
} from '@convex-dev/better-auth/react';
import { ThemeProvider } from '@react-navigation/native';
import { api } from '@repo/backend/convex/_generated/api';
import { ConvexProvider, ConvexReactClient, useQuery } from 'convex/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider } from 'posthog-react-native';
import { type ReactNode, useEffect } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { SplashScreen } from '@/components/SplashScreen';
import { posthog, resetAnalytics, useAnalyticsOptOut } from '@/lib/analytics';
import { authClient, useAuth } from '@/lib/auth';
import { AppearanceProvider, toastConfig, useAppearance } from '@/lib/ui';

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string,
  {
    unsavedChangesWarning: false,
  }
);

// @convex-dev/better-auth supports expoClient at runtime but omits it from
// ConvexBetterAuthProvider's client union.
const convexAuthClient = authClient as unknown as ConvexAuthClient;
function AppProviders({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  if (!posthog) {
    return children;
  }

  return (
    <PostHogProvider client={posthog} autocapture={false}>
      {children}
    </PostHogProvider>
  );
}

function NavigationContent({
  isAuthenticated,
}: Readonly<{
  isAuthenticated: boolean;
}>) {
  const { navigationTheme, resolvedAppearance } = useAppearance();
  useAnalyticsOptOut(isAuthenticated);
  const profile = useQuery(
    api.profile.getCurrentProfile,
    isAuthenticated ? {} : 'skip'
  );
  if (isAuthenticated && profile === undefined) {
    return <SplashScreen />;
  }
  const needsOnboarding = isAuthenticated && !profile?.username;
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style={resolvedAppearance === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={needsOnboarding}>
              <Stack.Screen name="(onboarding)" />
            </Stack.Protected>
            <Stack.Protected guard={isAuthenticated && !needsOnboarding}>
              <Stack.Screen name="(main)" />
            </Stack.Protected>
            <Stack.Protected guard={!isAuthenticated}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
          <Toast config={toastConfig} />
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      resetAnalytics();
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <AppProviders>
      <AppearanceProvider isAuthenticated={isAuthenticated}>
        <NavigationContent isAuthenticated={isAuthenticated} />
      </AppearanceProvider>
    </AppProviders>
  );
}

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <ConvexBetterAuthProvider client={convex} authClient={convexAuthClient}>
        <RootNavigator />
      </ConvexBetterAuthProvider>
    </ConvexProvider>
  );
}
