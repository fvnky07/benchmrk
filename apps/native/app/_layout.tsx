import '../global.css';

import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { ThemeProvider } from '@react-navigation/native';
import { api } from '@repo/backend/convex/_generated/api';
import { PortalHost } from '@rn-primitives/portal';
import { ConvexReactClient, useQuery } from 'convex/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { PostHogProvider } from 'posthog-react-native';
import { type ReactNode, useEffect } from 'react';
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

const ENABLE_POSTHOG = process.env.EXPO_PUBLIC_ENABLE_POSTHOG !== 'false';

function AppProviders({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  if (!ENABLE_POSTHOG) {
    return children;
  }

  return (
    <PostHogProvider
      apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY!}
      options={{
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST!,
      }}
    >
      {children}
    </PostHogProvider>
  );
}

function AuthenticatedRoutes({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const profile = useQuery(
    api.profile.getCurrentProfile,
    isAuthenticated ? {} : 'skip'
  );
  if (isAuthenticated && profile === undefined) {
    return <SplashScreen />;
  }
  const needsOnboarding = isAuthenticated && !profile?.username;

  return (
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
  );
}

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
      <AppProviders>
        <SafeAreaProvider>
          <KeyboardProvider>
            <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
              <AuthenticatedRoutes isAuthenticated={isAuthenticated} />
              <PortalHost />
              <Toast config={toastConfig} />
            </ThemeProvider>
          </KeyboardProvider>
        </SafeAreaProvider>
      </AppProviders>
    </ConvexBetterAuthProvider>
  );
}
