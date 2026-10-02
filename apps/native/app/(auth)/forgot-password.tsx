import { Button } from '@expo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AuthShell, AuthStatus } from '@/components/native/auth-shell';
import { NativeTextField } from '@/components/native/native-text-field';
import { authClient, emailSchema, useAuthStore } from '@/lib';

type Status = { message: string; tone: 'neutral' | 'error' } | null;

/** Where the emailed reset link returns to; the backend enforces it too. */
const RESET_CALLBACK = 'native://reset-password';

/**
 * Asks Better Auth for a reset link. The answer never reveals whether the email
 * has an account; only verified emails get mail.
 */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const email = useAuthStore((state) => state.email);
  const setEmail = useAuthStore((state) => state.setEmail);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [emailError, setEmailError] = useState<string | undefined>();

  const sendLink = async () => {
    setStatus(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email: parsed.data,
        redirectTo: RESET_CALLBACK,
      });
      if (error) throw new Error(error.code ?? 'request failed');
      setStatus({
        message:
          'If this email belongs to a verified benchmrk account, a reset link is on its way. Open it on this phone.',
        tone: 'neutral',
      });
    } catch {
      setStatus({
        message:
          'Couldn’t request a reset link. Check your connection and try again.',
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      supportingText="Enter the email you sign in with. Password recovery needs a verified email."
    >
      <NativeTextField
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={emailError}
        keyboardType="email-address"
        label="Email"
        onChangeText={(value) => {
          setEmail(value);
          setEmailError(undefined);
        }}
        placeholder="you@example.com"
        value={email}
      />
      <Button
        disabled={busy}
        label={busy ? 'Sending…' : 'Send reset link'}
        onPress={sendLink}
      />
      {status ? (
        <AuthStatus message={status.message} tone={status.tone} />
      ) : null}
      <Button
        label="Back to log in"
        variant="text"
        onPress={() => router.replace('/login')}
      />
    </AuthShell>
  );
}
