import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useColorScheme, View } from 'react-native';

// TODO: Re-enable interactive theme toggle once theme persistence
// (userPreferences) is implemented. Renders a static indicator only.
function ThemeIndicator() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={{ marginRight: 16 }}>
      <Ionicons
        name={isDark ? 'sunny-outline' : 'moon-outline'}
        size={24}
        color="#00ff90"
      />
    </View>
  );
}

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#1f1f1f' },
        headerTitleStyle: { color: 'white' },
        headerRight: () => <ThemeIndicator />,
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
      <Stack.Screen
        name="create-profile"
        options={{
          title: 'Create Profile',
          headerBackVisible: false,
        }}
      />
    </Stack>
  );
}
