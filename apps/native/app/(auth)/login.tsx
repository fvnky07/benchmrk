import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
  analytics,
  authClient,
  loginSchema,
  showToast,
  useAuthStore,
  useFormValidation,
} from '@/lib';

export default function LoginScreen() {
  const router = useRouter();
  const email = useAuthStore((state) => state.email);
  const setEmail = useAuthStore((state) => state.setEmail);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { errors, handleSubmit, clearError, hasSubmitted } = useFormValidation({
    schema: loginSchema,
    mode: 'onChange',
  });

  const onSubmit = () => {
    handleSubmit({ email, password }, async () => {
      try {
        setIsLoading(true);

        const result = await authClient.signIn.email({
          email,
          password,
        });

        // Successfully logged in, navigate to main app index
        if (result.data) {
          analytics.loginSuccess();
          setTimeout(() => {
            router.replace('/(main)');
          }, 100);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Invalid credentials';
        analytics.loginFailed(errorMessage);
        showToast.error('Login failed', errorMessage);
        // Clear password on error
        setPassword('');
      } finally {
        setIsLoading(false);
      }
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-black-1" edges={['top']}>
      <KeyboardAwareScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
      >
        <View className="flex w-full items-start justify-center gap-1">
          <View className="mb-6 flex w-full flex-row items-center justify-center gap-2">
            <Text className="text-4xl">Welcome Back!</Text>
          </View>
          <Input
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (hasSubmitted) clearError('email');
            }}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            style={{ backgroundColor: '#202020' }}
            className="h-12"
            aria-invalid={!!errors.email}
          />
          <Input
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (hasSubmitted) clearError('password');
            }}
            placeholder="Password"
            autoCapitalize="none"
            secureTextEntry={true}
            autoComplete="password"
            autoCorrect={false}
            style={{ backgroundColor: '#202020' }}
            className="h-12"
            aria-invalid={!!errors.password}
          />
          <Pressable
            onPress={() => {
              router.push('/forgot-password');
            }}
          >
            <Text className="mt-1 pl-2 text-blue-400">Forgot Password?</Text>
          </Pressable>
        </View>

        <View className="flex-1" />

        <View className="mb-6 flex w-full items-center justify-center">
          <Button className="w-full" onPress={onSubmit} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="black" />
            ) : (
              <>
                <Text>Continue with email</Text>
                <Feather name="arrow-right" size={24} color="black" />
              </>
            )}
          </Button>
          <Pressable
            onPress={() => {
              router.replace('/register');
            }}
          >
            <Text className="mt-4 pl-2 text-blue-400">
              Dont have an account?
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
