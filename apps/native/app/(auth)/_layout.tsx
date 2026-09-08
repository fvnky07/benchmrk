import { Stack } from 'expo-router';

import { useAppearance } from '@/lib/ui';

export default function AuthLayout() {
  const { navigationTheme } = useAppearance();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: navigationTheme.colors.card },
        headerTintColor: navigationTheme.colors.primary,
        headerTitleStyle: { color: navigationTheme.colors.text },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Welcome',
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: 'Log In',
        }}
      />
      <Stack.Screen
        name="welcome"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: 'Register',
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: 'Forgot Password',
        }}
      />
      <Stack.Screen
        name="verify-2fa"
        options={{
          title: 'Verify Code',
          headerBackVisible: true,
        }}
      />
    </Stack>
  );
}
