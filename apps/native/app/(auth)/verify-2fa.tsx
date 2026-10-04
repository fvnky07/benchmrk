import { Button } from '@expo/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AuthShell, AuthStatus } from '@/components/native/auth-shell';
import { NativeTextField } from '@/components/native/native-text-field';
import { analytics, authClient } from '@/lib';

type Factor = 'totp' | 'backup';

/**
 * The sign-in challenge for members with two-factor authentication: a code
 * from their authenticator app, or one of their backup codes. A session only
 * exists once Better Auth accepts the code; the root gate then routes.
 */
export default function VerifyTwoFactorScreen() {
  const router = useRouter();
  const [factor, setFactor] = useState<Factor>('totp');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const verify = async () => {
    const trimmed = code.trim();
    if (trimmed === '') return;
    setErrorMessage(null);
    setBusy(true);
    try {
      const { error } =
        factor === 'totp'
          ? await authClient.twoFactor.verifyTotp({ code: trimmed })
          : await authClient.twoFactor.verifyBackupCode({ code: trimmed });
      if (error) {
        setCode('');
        setErrorMessage(
          factor === 'totp'
            ? 'That code didn’t work. Check your authenticator app and try again.'
            : 'That backup code didn’t work. Each one works once.'
        );
        setBusy(false);
        return;
      }
      analytics.loginSuccess();
      setIsVerified(true);
    } catch {
      setErrorMessage(
        'Couldn’t reach benchmrk. Check your connection and try again.'
      );
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Two-factor authentication"
      supportingText={
        factor === 'totp'
          ? 'Enter the 6-digit code from your authenticator app.'
          : 'Enter one of the backup codes you saved when you set up two-factor authentication.'
      }
    >
      <NativeTextField
        autoCapitalize="none"
        autoComplete="one-time-code"
        autoCorrect={false}
        keyboardType={factor === 'totp' ? 'number-pad' : 'default'}
        label={factor === 'totp' ? 'Authenticator code' : 'Backup code'}
        maxLength={factor === 'totp' ? 6 : 32}
        onChangeText={(value) => {
          setCode(value);
          setErrorMessage(null);
        }}
        placeholder={factor === 'totp' ? '123456' : 'Backup code'}
        value={code}
      />
      <Button
        disabled={busy || code.trim() === ''}
        label={busy ? 'Checking…' : 'Verify'}
        onPress={verify}
      />
      {errorMessage ? <AuthStatus message={errorMessage} tone="error" /> : null}
      {isVerified ? (
        <AuthStatus message="Verified. Loading your benchmrk identity…" />
      ) : null}
      <Button
        disabled={busy}
        label={
          factor === 'totp'
            ? 'Use a backup code instead'
            : 'Use my authenticator app'
        }
        variant="text"
        onPress={() => {
          setFactor(factor === 'totp' ? 'backup' : 'totp');
          setCode('');
          setErrorMessage(null);
        }}
      />
      <Button
        disabled={busy}
        label="Back to log in"
        variant="text"
        onPress={() => router.replace('/login')}
      />
    </AuthShell>
  );
}
