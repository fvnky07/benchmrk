import { Button, ListItem, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import {
  analytics,
  authClient,
  emailSchema,
  loginSchema,
  useAuthStore,
  useFormValidation,
} from '@/lib';

export default function LoginScreen() {
  const router = useRouter();
  const email = useAuthStore((state) => state.email);
  const setEmail = useAuthStore((state) => state.setEmail);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [magicLinkSubmitted, setMagicLinkSubmitted] = useState(false);
  const requestMagicLink = useMutation(api.waitlist.requestNativeMagicLink);

  const { errors, handleSubmit, clearError, hasSubmitted } = useFormValidation({
    schema: loginSchema,
    mode: 'onChange',
  });

  const onSubmit = () => {
    setErrorMessage(null);

    handleSubmit({ email, password }, async () => {
      try {
        setIsLoading(true);
        const { data, error } = await authClient.signIn.email({
          email,
          password,
        });
        if (error) {
          throw new Error(error.message ?? 'Unable to sign in');
        }
        if (!data) {
          throw new Error('Sign in did not complete');
        }
        analytics.loginSuccess();
        setTimeout(() => router.replace('/(main)'), 100);
      } catch {
        const message = 'Unable to sign in. Check your email and password.';
        analytics.loginFailed(message);
        setErrorMessage(message);
        setPassword('');
      } finally {
        setIsLoading(false);
      }
    });
  };

  const onMagicLinkSubmit = async () => {
    setErrorMessage(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setErrorMessage('Invalid email address');
      return;
    }

    try {
      setIsLoading(true);
      await requestMagicLink({ email: parsed.data });
      setMagicLinkSubmitted(true);
    } catch {
      setErrorMessage('Unable to complete sign-in request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 32, fontWeight: '700' }}>Welcome back</Text>
      <Text>
        Sign in with your password or request a link if your account is
        eligible.
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
        autoComplete="password"
        autoCorrect={false}
        error={errors.password}
        label="Password"
        onChangeText={(value) => {
          setPassword(value);
          if (hasSubmitted) clearError('password');
        }}
        placeholder="Password"
        secureTextEntry
        value={password}
      />
      <Button
        label="Forgot password?"
        variant="text"
        onPress={() => router.push('/forgot-password')}
      />
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Log in failed</ListItem>
      ) : magicLinkSubmitted ? (
        <ListItem supportingText="If an eligible account exists, check your email for a sign-in link.">
          Check your email
        </ListItem>
      ) : null}
      <Button
        disabled={isLoading}
        label={isLoading ? 'Logging in…' : 'Continue with email'}
        onPress={onSubmit}
      />
      <Button
        disabled={isLoading}
        label="Email me a sign-in link"
        onPress={onMagicLinkSubmit}
        variant="outlined"
      />
      <Button
        label="Create an account"
        variant="outlined"
        onPress={() => router.replace('/register')}
      />
    </NativeScreen>
  );
}
