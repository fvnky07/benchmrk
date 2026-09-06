import { Button, ListItem, Text } from '@expo/ui';
import { router } from 'expo-router';
import { useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { analytics } from '@/lib/analytics';
import { authClient, useAuthStore } from '@/lib/auth';
import { useFormValidation } from '@/lib/hooks/use-form-validation';
import { registerSchema } from '@/lib/schemas/auth';

export default function RegisterScreen() {
  const email = useAuthStore((state) => state.email);
  const setEmail = useAuthStore((state) => state.setEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { errors, handleSubmit, clearError, hasSubmitted } = useFormValidation({
    schema: registerSchema,
    mode: 'onChange',
  });

  const resetPasswords = () => {
    setPassword('');
    setConfirmPassword('');
  };

  const onSubmit = () => {
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      resetPasswords();
      return;
    }

    handleSubmit({ email, password, confirmPassword }, async () => {
      try {
        setIsLoading(true);

        const { error } = await authClient.signUp.email({
          email,
          password,
          name: email.split('@')[0],
        });
        if (error) {
          throw new Error(error.message ?? 'Unable to create your account');
        }

        analytics.signupSuccess();
        router.push('/create-profile');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Invalid credentials';
        analytics.signupFailed(message);
        setErrorMessage(message);
        resetPasswords();
        setEmail('');
      } finally {
        setIsLoading(false);
      }
    });
  };

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 32, fontWeight: '700' }}>
        Create an account
      </Text>
      <NativeTextField
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={errors.email}
        keyboardType="email-address"
        label="Email"
        onChangeText={(value) => {
          setEmail(value);
          if (hasSubmitted) clearError('email');
        }}
        placeholder="you@example.com"
        value={email}
      />
      <NativeTextField
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        error={errors.password}
        label="Password"
        onChangeText={(value) => {
          setPassword(value);
          if (hasSubmitted) clearError('password');
        }}
        placeholder="Choose a password"
        secureTextEntry
        value={password}
      />
      <NativeTextField
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        error={errors.confirmPassword}
        label="Confirm password"
        onChangeText={(value) => {
          setConfirmPassword(value);
          if (hasSubmitted) clearError('confirmPassword');
        }}
        placeholder="Repeat your password"
        secureTextEntry
        value={confirmPassword}
      />
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>
          Could not create account
        </ListItem>
      ) : null}
      <Button
        disabled={isLoading}
        label={isLoading ? 'Creating account…' : 'Create account'}
        onPress={onSubmit}
      />
      <Button
        label="Log in instead"
        variant="outlined"
        onPress={() => router.replace('/login')}
      />
    </NativeScreen>
  );
}
