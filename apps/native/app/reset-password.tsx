import { Button } from '@expo/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { AuthShell, AuthStatus } from '@/components/native/auth-shell';
import { NativeTextField } from '@/components/native/native-text-field';
import { authClient, passwordSchema } from '@/lib';
import { completePasswordReset } from '@/lib/auth/password-reset';

type Status = { message: string; tone: 'neutral' | 'error' } | null;

/**
 * Where a password reset link lands (`native://reset-password`). A valid link
 * carries `token`; an invalid or expired one carries `error`. The password
 * changes only when the backend accepts the token.
 */
export default function ResetPasswordScreen() {
  const { token, error } = useLocalSearchParams<{
    token?: string;
    error?: string;
  }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  if (error || !token) {
    return (
      <AuthShell
        title="This reset link didn’t work"
        supportingText="It may have expired or already been used. Ask for a new one."
      >
        <Button
          label="Request a new link"
          onPress={() => router.replace('/forgot-password')}
        />
      </AuthShell>
    );
  }

  if (isDone) {
    return (
      <AuthShell
        title="Password changed"
        supportingText="Every device was signed out. Log in with your new password."
      >
        <Button label="Log in" onPress={() => router.replace('/login')} />
      </AuthShell>
    );
  }

  const reset = async () => {
    setStatus(null);
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      return;
    }
    if (password !== confirmPassword) {
      setFieldError("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const completed = await completePasswordReset(
        () => authClient.resetPassword({ newPassword: password, token }),
        () => authClient.signOut()
      );
      if (!completed) {
        setStatus({
          message:
            'This reset link has expired or was already used. Ask for a new one.',
          tone: 'error',
        });
        return;
      }
      setIsDone(true);
    } catch {
      setStatus({
        message:
          'Couldn’t reach benchmrk. Check your connection and try again.',
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Choose a new password"
      supportingText="Use 8 or more characters with upper and lower case and a number."
    >
      <NativeTextField
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        error={fieldError}
        label="New password"
        onChangeText={(value) => {
          setPassword(value);
          setFieldError(undefined);
        }}
        placeholder="New password"
        secureTextEntry
        value={password}
      />
      <NativeTextField
        autoCapitalize="none"
        autoComplete="new-password"
        autoCorrect={false}
        label="Confirm new password"
        onChangeText={(value) => {
          setConfirmPassword(value);
          setFieldError(undefined);
        }}
        placeholder="Repeat your new password"
        secureTextEntry
        value={confirmPassword}
      />
      <Button
        disabled={busy}
        label={busy ? 'Saving…' : 'Change password'}
        onPress={reset}
      />
      {status ? (
        <AuthStatus message={status.message} tone={status.tone} />
      ) : null}
      {status?.tone === 'error' ? (
        <Button
          label="Request a new link"
          variant="text"
          onPress={() => router.replace('/forgot-password')}
        />
      ) : null}
    </AuthShell>
  );
}
