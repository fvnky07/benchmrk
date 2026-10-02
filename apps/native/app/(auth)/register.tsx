import { Button } from '@expo/ui';
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
import { registerSchema } from '@/lib/schemas/auth';

type Status = { message: string; tone: 'neutral' | 'error' } | null;

/** Better Auth's code when the email already has an identity. */
const EMAIL_TAKEN_CODES = new Set([
  'USER_ALREADY_EXISTS',
  'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
]);

/**
 * Email, password and confirmation together. A successful sign-up keeps the
 * form locked: the root onboarding gate takes over once the session lands, and
 * Profile setup stays its own checkpoint.
 */
export default function RegisterScreen() {
  const router = useRouter();
  const email = useAuthStore((state) => state.email);
  const setEmail = useAuthStore((state) => state.setEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const pendingPath = useAuthStore((state) => state.pendingPath);
  const beginPending = useAuthStore((state) => state.beginPending);
  const endPending = useAuthStore((state) => state.endPending);
  const [status, setStatus] = useState<Status>(null);

  const { errors, handleSubmit, clearError, hasSubmitted } = useFormValidation({
    schema: registerSchema,
    mode: 'onChange',
  });

  // One pending lock covers this form and the provider buttons; leaving releases it.
  useEffect(() => endPending, [endPending]);

  const signUp = () => {
    setStatus(null);
    handleSubmit({ email, password, confirmPassword }, async () => {
      if (!beginPending('register')) return;
      try {
        const { data, error } = await authClient.signUp.email({
          email,
          password,
          name: email.split('@')[0] ?? email,
        });
        if (error || !data) {
          const taken = error?.code ? EMAIL_TAKEN_CODES.has(error.code) : false;
          const message = taken
            ? 'A Benchmrk identity with this email already exists. Log in instead.'
            : authErrorCopy(error?.code, 'Couldn’t sign you up. Try again.');
          analytics.signupFailed(error?.code ?? 'unknown');
          setStatus({ message, tone: 'error' });
          setPassword('');
          setConfirmPassword('');
          endPending();
          return;
        }
        analytics.signupSuccess();
        setStatus({
          message:
            'You’re signed up. We sent a link to verify your email. Setting up your profile…',
          tone: 'neutral',
        });
      } catch {
        analytics.signupFailed('network');
        setStatus({
          message:
            'Couldn’t reach Benchmrk. Check your connection and try again.',
          tone: 'error',
        });
        endPending();
      }
    });
  };

  return (
    <AuthShell
      title="Sign up"
      supportingText="Use your email and a password, or continue with Apple or Google."
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
        autoComplete="new-password"
        autoCorrect={false}
        editable={pendingPath === null}
        error={errors.password}
        label="Password"
        onChangeText={(value) => {
          setPassword(value);
          if (hasSubmitted) clearError('password');
        }}
        placeholder="8+ characters, upper and lower case, a number"
        secureTextEntry
        value={password}
      />
      <NativeTextField
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        editable={pendingPath === null}
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
      <Button
        disabled={pendingPath !== null}
        label={pendingPath === 'register' ? 'Signing up…' : 'Sign up'}
        onPress={signUp}
      />
      {status ? (
        <AuthStatus message={status.message} tone={status.tone} />
      ) : null}
      <SocialProviderGroup dividerPosition="before" />
      <Button
        disabled={pendingPath !== null}
        label="Log in instead"
        variant="text"
        onPress={() => router.replace('/login')}
      />
    </AuthShell>
  );
}
