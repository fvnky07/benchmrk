import { Button } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useAction } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { AuthShell, AuthStatus } from '@/components/native/auth-shell';
import { NativeTextField } from '@/components/native/native-text-field';
import { SocialProviderGroup } from '@/components/native/social-provider-group';
import { analytics } from '@/lib/analytics';
import { authClient } from '@/lib/auth/client';
import { authErrorCopy } from '@/lib/auth/error-copy';
import { useAuthStore } from '@/lib/auth/store';
import { useFormValidation } from '@/lib/hooks/use-form-validation';
import { emailSchema, loginSchema } from '@/lib/schemas/auth';
import { errorCode } from '@/lib/workout/format';

type Status = { message: string; tone: 'neutral' | 'error' } | null;

export default function LoginScreen() {
  const router = useRouter();
  const email = useAuthStore((state) => state.email);
  const setEmail = useAuthStore((state) => state.setEmail);
  const requestSignInLink = useAction(api.waitlist.requestSignInLink);
  const [password, setPassword] = useState('');
  const pendingPath = useAuthStore((state) => state.pendingPath);
  const beginPending = useAuthStore((state) => state.beginPending);
  const endPending = useAuthStore((state) => state.endPending);
  const [status, setStatus] = useState<Status>(null);

  const { errors, handleSubmit, clearError, hasSubmitted } = useFormValidation({
    schema: loginSchema,
    mode: 'onChange',
  });

  // One pending lock covers this form and the provider buttons; leaving releases it.
  useEffect(() => endPending, [endPending]);

  const signInWithPassword = () => {
    setStatus(null);
    handleSubmit({ email, password }, async () => {
      if (!beginPending('password')) return;
      try {
        const { data, error } = await authClient.signIn.email({
          email,
          password,
        });
        if (error || !data) throw new Error('Sign in did not complete');
        if ('twoFactorRedirect' in data && data.twoFactorRedirect) {
          setPassword('');
          endPending();
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
        endPending();
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
    if (!beginPending('link')) return;
    try {
      await requestSignInLink({ email: parsed.data });
      setStatus({
        message:
          'If this email belongs to a confirmed waitlist member, a sign-in link is on its way. Open it on this phone.',
        tone: 'neutral',
      });
    } catch (error) {
      setStatus({
        message: authErrorCopy(
          errorCode(error),
          'Couldn’t request a sign-in link. Check your connection and try again.'
        ),
        tone: 'error',
      });
    } finally {
      endPending();
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
        editable={pendingPath === null}
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
        editable={pendingPath === null}
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
        disabled={pendingPath !== null}
        label="Forgot password?"
        variant="text"
        onPress={() => router.push('/forgot-password')}
      />
      <Button
        disabled={pendingPath !== null}
        label={
          pendingPath === 'password' ? 'Signing in…' : 'Continue with email'
        }
        onPress={signInWithPassword}
      />
      <Button
        disabled={pendingPath !== null}
        label={
          pendingPath === 'link' ? 'Requesting…' : 'Email me a sign-in link'
        }
        variant="outlined"
        onPress={emailMeALink}
      />
      {status ? (
        <AuthStatus message={status.message} tone={status.tone} />
      ) : null}
      <SocialProviderGroup dividerPosition="before" />
      <Button
        disabled={pendingPath !== null}
        label="Sign up"
        variant="text"
        onPress={() => router.replace('/register')}
      />
    </AuthShell>
  );
}
