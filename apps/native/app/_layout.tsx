import '../global.css';

import {
  type AuthClient as ConvexAuthClient,
  ConvexBetterAuthProvider,
} from '@convex-dev/better-auth/react';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PostHogProvider } from 'posthog-react-native';
import { type ReactNode, useEffect } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { SplashScreen } from '@/components/SplashScreen';
import { identifyUser, posthog, resetAnalytics } from '@/lib/analytics';
import { authClient, useAuth } from '@/lib/auth';
import { AppearanceProvider, toastConfig, useAppearance } from '@/lib/ui';

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string,
  {
    // Optionally pause queries until the user is authenticated
    expectAuth: true,
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
    <PostHogProvider client={posthog} autocapture={{ captureScreens: false }}>
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

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style={resolvedAppearance === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={isAuthenticated}>
              <Stack.Screen name="(main)" />
            </Stack.Protected>
            <Stack.Protected guard={!isAuthenticated}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
          <PortalHost />
          <Toast config={toastConfig} />
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
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
