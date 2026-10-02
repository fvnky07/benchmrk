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
import { identifyUser, posthog, resetAnalytics } from '@/lib/analytics';
import { useAnalyticsOptOut } from '@/lib/analytics/use-analytics-opt-out';
import { authClient } from '@/lib/auth/client';
import { useAuth } from '@/lib/auth/hooks';
import { usePushProfileSetupStep } from '@/lib/push/profile-setup-push-step';
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
  identityId,
}: Readonly<{
  isAuthenticated: boolean;
  identityId: string | undefined;
}>) {
  const { navigationTheme, resolvedAppearance } = useAppearance();
  useAnalyticsOptOut(isAuthenticated);
  const profile = useQuery(
    api.profile.getCurrentProfile,
    isAuthenticated ? {} : 'skip'
  );
  const pushSetup = usePushProfileSetupStep(
    identityId,
    isAuthenticated && profile !== undefined && !profile?.username
  );
  if (isAuthenticated && (profile === undefined || pushSetup.loading)) {
    return <SplashScreen />;
  }
  const needsOnboarding =
    isAuthenticated && (!profile?.username || pushSetup.pending);
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
        <NavigationContent
          isAuthenticated={isAuthenticated}
          identityId={user?.id}
        />
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
