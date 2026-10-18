import { Button, Text } from '@expo/ui';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { Card, CardRow } from '@/components/native/card';
import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { PrimaryButton } from '@/components/native/primary-button';
import { SectionHeader } from '@/components/native/section-header';
import { authClient } from '@/lib/auth/client';
import { useAuth } from '@/lib/auth/hooks';
import { font, space, tabularDigits, textColor, useColors } from '@/lib/ui';

/**
 * Enrollment state. Secret material lives only here, only while it's shown,
 * and is dropped the moment the member moves on.
 */
type Step =
  | { kind: 'idle' }
  | { kind: 'password'; purpose: 'enable' | 'disable' }
  | { kind: 'scan'; totpURI: string; backupCodes: string[] }
  | { kind: 'backup-codes'; backupCodes: string[] };

function setupKey(totpURI: string): string {
  return new URL(totpURI).searchParams.get('secret') ?? '';
}

export default function TwoFactorScreen() {
  const colors = useColors();
  const lead = { ...font.body, color: textColor(colors.onSurfaceVariant) };
  const { user } = useAuth();
  const isEnabled = user?.twoFactorEnabled === true;
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void authClient.listAccounts().then(({ data }) => {
      setHasPassword(
        (data ?? []).some((account) => account.providerId === 'credential')
      );
    });
  }, []);

  const finish = () => {
    setPassword('');
    setCode('');
    setErrorMessage(null);
    setStep({ kind: 'idle' });
  };

  const submitPassword = async (purpose: 'enable' | 'disable') => {
    setErrorMessage(null);
    setBusy(true);
    try {
      if (purpose === 'enable') {
        const { data, error } = await authClient.twoFactor.enable({ password });
        if (error || !data) {
          setErrorMessage('That password isn’t right.');
          return;
        }
        setPassword('');
        setStep({
          kind: 'scan',
          totpURI: data.totpURI,
          backupCodes: data.backupCodes,
        });
      } else {
        const { error } = await authClient.twoFactor.disable({ password });
        if (error) {
          setErrorMessage('That password isn’t right.');
          return;
        }
        finish();
      }
    } catch {
      setErrorMessage(
        'Couldn’t reach benchmrk. Check your connection and try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async (backupCodes: string[]) => {
    setErrorMessage(null);
    setBusy(true);
    try {
      const { error } = await authClient.twoFactor.verifyTotp({
        code: code.trim(),
      });
      if (error) {
        setCode('');
        setErrorMessage(
          'That code didn’t work. Try the newest code from your app.'
        );
        return;
      }
      setCode('');
      setStep({ kind: 'backup-codes', backupCodes });
    } catch {
      setErrorMessage(
        'Couldn’t reach benchmrk. Check your connection and try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (hasPassword === false) {
    return (
      <NativeScreen>
        <Card>
          <CardRow supportingText="Two-factor authentication protects password sign-in. Set a password in Manage Account first.">
            Needs a password
          </CardRow>
        </Card>
        <PrimaryButton label="Back" onPress={() => router.back()} />
      </NativeScreen>
    );
  }

  if (step.kind === 'password') {
    return (
      <NativeScreen>
        <Text textStyle={lead}>
          {step.purpose === 'enable'
            ? 'Confirm your password to set up two-factor authentication.'
            : 'Confirm your password to turn off two-factor authentication.'}
        </Text>
        <Card padding={space.lg} spacing={space.md}>
          <NativeTextField
            autoCapitalize="none"
            autoComplete="password"
            label="Password"
            onChangeText={setPassword}
            secureTextEntry
            value={password}
          />
        </Card>
        {errorMessage ? (
          <Card>
            <CardRow supportingText={errorMessage}>Not changed</CardRow>
          </Card>
        ) : null}
        <PrimaryButton
          disabled={busy || password === ''}
          label={busy ? 'Checking…' : 'Continue'}
          onPress={() => void submitPassword(step.purpose)}
        />
        <Button label="Cancel" variant="text" onPress={finish} />
      </NativeScreen>
    );
  }

  if (step.kind === 'scan') {
    return (
      <NativeScreen>
        <Text textStyle={lead}>
          Add benchmrk to your authenticator app, then enter the code it shows.
        </Text>
        <Card divided>
          <CardRow chevron onPress={() => void Linking.openURL(step.totpURI)}>
            Open in authenticator app
          </CardRow>
          <CardRow
            supportingText={setupKey(step.totpURI)}
            onPress={() =>
              void Clipboard.setStringAsync(setupKey(step.totpURI))
            }
          >
            Setup key (tap to copy)
          </CardRow>
        </Card>
        <Card padding={space.lg} spacing={space.md}>
          <NativeTextField
            autoComplete="one-time-code"
            keyboardType="number-pad"
            label="Code from your app"
            maxLength={6}
            onChangeText={setCode}
            placeholder="123456"
            value={code}
          />
        </Card>
        {errorMessage ? (
          <Card>
            <CardRow supportingText={errorMessage}>Not turned on yet</CardRow>
          </Card>
        ) : null}
        <PrimaryButton
          disabled={busy || code.trim().length !== 6}
          label={busy ? 'Checking…' : 'Turn on two-factor authentication'}
          onPress={() => void confirmCode(step.backupCodes)}
        />
        <Button label="Cancel" variant="text" onPress={finish} />
      </NativeScreen>
    );
  }

  if (step.kind === 'backup-codes') {
    return (
      <NativeScreen>
        <SectionHeader
          title="Save your backup codes"
          supportingText="Each code signs you in once if you lose your authenticator. They won’t be shown again."
        />
        <Card divided>
          {step.backupCodes.map((backupCode) => (
            <CardRow key={backupCode}>
              <Text
                modifiers={tabularDigits()}
                textStyle={{
                  ...font.bodyStrong,
                  color: textColor(colors.onSurface),
                }}
              >
                {backupCode}
              </Text>
            </CardRow>
          ))}
        </Card>
        <Button
          label="Copy codes"
          variant="outlined"
          onPress={() =>
            void Clipboard.setStringAsync(step.backupCodes.join('\n'))
          }
        />
        <PrimaryButton label="I saved them" onPress={finish} />
      </NativeScreen>
    );
  }

  return (
    <NativeScreen>
      <Card>
        <CardRow
          supportingText={
            isEnabled
              ? 'Signing in with your password also needs a code from your authenticator app.'
              : 'Add a code from an authenticator app to password sign-in.'
          }
        >
          {isEnabled
            ? 'Two-factor authentication is on'
            : 'Two-factor authentication is off'}
        </CardRow>
      </Card>
      {isEnabled ? (
        <Button
          disabled={hasPassword === null}
          label="Turn off"
          variant="outlined"
          onPress={() => setStep({ kind: 'password', purpose: 'disable' })}
        />
      ) : (
        <PrimaryButton
          disabled={hasPassword === null}
          label="Set up"
          onPress={() => setStep({ kind: 'password', purpose: 'enable' })}
        />
      )}
    </NativeScreen>
  );
}
