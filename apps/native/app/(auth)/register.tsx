import { Button, ListItem, Text } from '@expo/ui';
import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { analytics } from '@/lib/analytics';
import { useAuthStore } from '@/lib/auth';
import { registerWithEmail } from '@/lib/auth/registration';
import { useFormValidation } from '@/lib/hooks/use-form-validation';
import { registerSchema } from '@/lib/schemas/auth';

export default function RegisterScreen() {
  const email = useAuthStore((state) => state.email);
  const setEmail = useAuthStore((state) => state.setEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestInFlight = useRef(false);

  const { errors, handleSubmit, clearError, hasSubmitted } = useFormValidation({
    schema: registerSchema,
    mode: 'onChange',
  });

  const onSubmit = () => {
    if (requestInFlight.current) return;

    setErrorMessage(null);

    handleSubmit(
      { email, password, confirmPassword },
      async ({ email: normalizedEmail, password: validatedPassword }) => {
        if (requestInFlight.current) return;

        requestInFlight.current = true;
        setIsLoading(true);

        try {
          await registerWithEmail({
            email: normalizedEmail,
            password: validatedPassword,
          });

          analytics.signupSuccess();
          router.push('/create-profile');
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to create account. Please try again.';
          analytics.signupFailed(message);
          setErrorMessage(message);
          setPassword('');
          setConfirmPassword('');
        } finally {
          requestInFlight.current = false;
          setIsLoading(false);
        }
      }
    );
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
          setErrorMessage(null);
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
          setErrorMessage(null);
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
          setErrorMessage(null);
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
