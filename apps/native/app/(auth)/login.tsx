import { Button } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AuthShell, AuthStatus } from '@/components/native/auth-shell';
import { NativeTextField } from '@/components/native/native-text-field';
import { SocialProviderGroup } from '@/components/native/social-provider-group';
import {
  analytics,
  authClient,
  emailSchema,
  loginSchema,
  useAuthStore,
  useFormValidation,
} from '@/lib';

type Status = { message: string; tone: 'neutral' | 'error' } | null;

export default function LoginScreen() {
  const router = useRouter();
  const email = useAuthStore((state) => state.email);
  const setEmail = useAuthStore((state) => state.setEmail);
  const requestSignInLink = useMutation(api.waitlist.requestSignInLink);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'password' | 'link' | null>(null);
  const [status, setStatus] = useState<Status>(null);

  const { errors, handleSubmit, clearError, hasSubmitted } = useFormValidation({
    schema: loginSchema,
    mode: 'onChange',
  });

  const signInWithPassword = () => {
    setStatus(null);
    handleSubmit({ email, password }, async () => {
      try {
        setBusy('password');
        const { data, error } = await authClient.signIn.email({
          email,
          password,
        });
        if (error || !data) throw new Error('Sign in did not complete');
        if ('twoFactorRedirect' in data && data.twoFactorRedirect) {
          setPassword('');
          setBusy(null);
          router.push('/verify-2fa');
          return;
        }
        analytics.loginSuccess();
        setStatus({
          message: 'Signed in. Loading your Benchmrk identity…',
          tone: 'neutral',
        });
      } catch {
        const message = 'Unable to sign in. Check your email and password.';
        analytics.loginFailed(message);
        setStatus({ message, tone: 'error' });
        setPassword('');
        setBusy(null);
      }
    });
  };

  const emailMeALink = async () => {
    setStatus(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setStatus({ message: 'Enter a valid email address.', tone: 'error' });
      return;
    }
    try {
      setBusy('link');
      await requestSignInLink({ email: parsed.data });
      setStatus({
        message:
          'If this email belongs to a confirmed waitlist member, a sign-in link is on its way. Open it on this phone.',
        tone: 'neutral',
      });
    } catch {
      setStatus({
        message:
          'Couldn’t request a sign-in link. Check your connection and try again.',
        tone: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <AuthShell
      title="Log in"
      supportingText="Sign in with your email and password, or ask for a sign-in link if you joined the waitlist."
    >
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
      <Button
        disabled={busy !== null}
        label={busy === 'password' ? 'Signing in…' : 'Continue with email'}
        onPress={signInWithPassword}
      />
      <Button
        disabled={busy !== null}
        label={busy === 'link' ? 'Requesting…' : 'Email me a sign-in link'}
        variant="outlined"
        onPress={emailMeALink}
      />
      {status ? (
        <AuthStatus message={status.message} tone={status.tone} />
      ) : null}
      <SocialProviderGroup dividerPosition="before" />
      <Button
        label="Create an account"
        variant="text"
        onPress={() => router.replace('/register')}
      />
    </AuthShell>
  );
}
