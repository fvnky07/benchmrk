import { Button } from '@expo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AuthShell, AuthStatus } from '@/components/native/auth-shell';
import { NativeTextField } from '@/components/native/native-text-field';
import { SocialProviderGroup } from '@/components/native/social-provider-group';
import {
  analytics,
  authClient,
  registerSchema,
  useAuthStore,
  useFormValidation,
} from '@/lib';

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
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const { errors, handleSubmit, clearError, hasSubmitted } = useFormValidation({
    schema: registerSchema,
    mode: 'onChange',
  });

  const createAccount = () => {
    setStatus(null);
    handleSubmit({ email, password, confirmPassword }, async () => {
      setBusy(true);
      try {
        const { data, error } = await authClient.signUp.email({
          email,
          password,
          name: email.split('@')[0] ?? email,
        });
        if (error || !data) {
          const taken = error?.code ? EMAIL_TAKEN_CODES.has(error.code) : false;
          const message = taken
            ? 'An account with this email already exists. Log in instead.'
            : 'Couldn’t create your account. Try again.';
          analytics.signupFailed(error?.code ?? 'unknown');
          setStatus({ message, tone: 'error' });
          setPassword('');
          setConfirmPassword('');
          setBusy(false);
          return;
        }
        analytics.signupSuccess();
        setStatus({
          message:
            'Account created. We sent a link to verify your email. Setting up your profile…',
          tone: 'neutral',
        });
      } catch {
        analytics.signupFailed('network');
        setStatus({
          message:
            'Couldn’t reach Benchmrk. Check your connection and try again.',
          tone: 'error',
        });
        setBusy(false);
      }
    });
  };

  return (
    <AuthShell
      title="Create an account"
      supportingText="Use your email and a password, or continue with Apple or Google."
    >
      <NativeTextField
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        editable={!busy}
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
        editable={!busy}
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
        editable={!busy}
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
        disabled={busy}
        label={busy ? 'Creating account…' : 'Create account'}
        onPress={createAccount}
      />
      {status ? (
        <AuthStatus message={status.message} tone={status.tone} />
      ) : null}
      <SocialProviderGroup dividerPosition="before" />
      <Button
        disabled={busy}
        label="Log in instead"
        variant="text"
        onPress={() => router.replace('/login')}
      />
    </AuthShell>
  );
}
