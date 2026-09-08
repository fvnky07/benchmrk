import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { analytics } from '@/lib/analytics';
import { authClient, useAuthStore } from '@/lib/auth';
import { useFormValidation } from '@/lib/hooks/use-form-validation';
import { registerSchema } from '@/lib/schemas/auth';
import { showToast } from '@/lib/ui';

export default function RegisterScreen() {
  const email = useAuthStore((state) => state.email);
  const setEmail = useAuthStore((state) => state.setEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { errors, handleSubmit, clearError, hasSubmitted } = useFormValidation({
    schema: registerSchema,
    mode: 'onChange',
  });

  const resetPasswords = () => {
    setPassword('');
    setConfirmPassword('');
  };

  const onSubmit = () => {
    if (password !== confirmPassword) {
      showToast.error('Registration failed', 'Passwords do not match');
      resetPasswords();
      return;
    }
    handleSubmit({ email, password, confirmPassword }, async () => {
      try {
        setIsLoading(true);

        await authClient.signUp.email({
          email,
          password,
          name: email.split('@')[0],
        });

        analytics.signupSuccess();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Invalid credentials';
        analytics.signupFailed(errorMessage);
        showToast.error('Sign up failed', errorMessage);
        resetPasswords();
        setEmail('');
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
            <Text className="text-4xl">Create an Account!</Text>
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
            autoComplete="new-password"
            autoCorrect={false}
            style={{ backgroundColor: '#202020' }}
            className="h-12"
            aria-invalid={!!errors.password}
          />
          <Input
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (hasSubmitted) clearError('confirmPassword');
            }}
            placeholder="Confirm Password"
            autoCapitalize="none"
            secureTextEntry={true}
            autoComplete="new-password"
            autoCorrect={false}
            style={{ backgroundColor: '#202020' }}
            className="h-12"
            aria-invalid={!!errors.confirmPassword}
          />
          {/* <Pressable */}
          {/*   onPress={() => { */}
          {/*     router.push('/forgot-password'); */}
          {/*   }} */}
          {/* > */}
          {/*   <Text className="mt-1 pl-2 text-blue-400">Forgot Password?</Text> */}
          {/* </Pressable> */}
        </View>
        <View className="flex-1" />
        <View className="mb-6 flex w-full items-center justify-center">
          <Button className="w-full" onPress={onSubmit} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color="black" />
            ) : (
              <>
                <Text>Register with email</Text>
                <Feather name="arrow-right" size={24} color="black" />
              </>
            )}
          </Button>
          <Pressable
            onPress={() => {
              router.replace('/login');
            }}
          >
            <Text className="mt-4 pl-2 text-blue-400">Log in instead?</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
