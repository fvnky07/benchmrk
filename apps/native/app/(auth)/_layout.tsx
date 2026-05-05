import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Pressable, useColorScheme } from 'react-native';

function ThemeToggle() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const toggleTheme = () => {
    // TODO: Implement theme persistence with userPreferences
  };

  return (
    <Pressable
      onPress={toggleTheme}
      style={({ pressed }) => ({
        marginRight: 16,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons
        name={isDark ? 'sunny-outline' : 'moon-outline'}
        size={24}
        color="#00ff90"
      />
    </Pressable>
  );
}

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#1f1f1f' },
        headerTitleStyle: { color: 'white' },
        headerRight: () => <ThemeToggle />,
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
