import { Button, Column, ListItem, Text } from '@expo/ui';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { authClient, useAuth } from '@/lib';

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
        <ListItem supportingText="Two-factor authentication protects password sign-in. Set a password in Manage Account first.">
          Needs a password
        </ListItem>
        <Button label="Back" onPress={() => router.back()} />
      </NativeScreen>
    );
  }

  if (step.kind === 'password') {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>
          {step.purpose === 'enable'
            ? 'Confirm your password to set up two-factor authentication.'
            : 'Confirm your password to turn off two-factor authentication.'}
        </Text>
        <NativeTextField
          autoCapitalize="none"
          autoComplete="password"
          label="Password"
          onChangeText={setPassword}
          secureTextEntry
          value={password}
        />
        {errorMessage ? (
          <ListItem supportingText={errorMessage}>Not changed</ListItem>
        ) : null}
        <Button
          disabled={busy || password === ''}
          label={busy ? 'Checking…' : 'Continue'}
          onPress={() => submitPassword(step.purpose)}
        />
        <Button label="Cancel" variant="text" onPress={finish} />
      </NativeScreen>
    );
  }

  if (step.kind === 'scan') {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 17 }}>
          Add benchmrk to your authenticator app, then enter the code it shows.
        </Text>
        <Button
          label="Open in authenticator app"
          onPress={() => void Linking.openURL(step.totpURI)}
        />
        <ListItem
          supportingText={setupKey(step.totpURI)}
          onPress={() => void Clipboard.setStringAsync(setupKey(step.totpURI))}
        >
          Setup key (tap to copy)
        </ListItem>
        <NativeTextField
          autoComplete="one-time-code"
          keyboardType="number-pad"
          label="Code from your app"
          maxLength={6}
          onChangeText={setCode}
          placeholder="123456"
          value={code}
        />
        {errorMessage ? (
          <ListItem supportingText={errorMessage}>Not turned on yet</ListItem>
        ) : null}
        <Button
          disabled={busy || code.trim().length !== 6}
          label={busy ? 'Checking…' : 'Turn on two-factor authentication'}
          onPress={() => confirmCode(step.backupCodes)}
        />
        <Button label="Cancel" variant="text" onPress={finish} />
      </NativeScreen>
    );
  }

  if (step.kind === 'backup-codes') {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 22, fontWeight: '700' }}>
          Save your backup codes
        </Text>
        <Text textStyle={{ fontSize: 15 }}>
          Each code signs you in once if you lose your authenticator. They won’t
          be shown again.
        </Text>
        <Column spacing={4}>
          {step.backupCodes.map((backupCode) => (
            <Text
              key={backupCode}
              textStyle={{ fontSize: 17, fontWeight: '600' }}
            >
              {backupCode}
            </Text>
          ))}
        </Column>
        <Button
          label="Copy codes"
          variant="outlined"
          onPress={() =>
            void Clipboard.setStringAsync(step.backupCodes.join('\n'))
          }
        />
        <Button label="I saved them" onPress={finish} />
      </NativeScreen>
    );
  }

  return (
    <NativeScreen>
      <ListItem
        supportingText={
          isEnabled
            ? 'Signing in with your password also needs a code from your authenticator app.'
            : 'Add a code from an authenticator app to password sign-in.'
        }
      >
        {isEnabled
          ? 'Two-factor authentication is on'
          : 'Two-factor authentication is off'}
      </ListItem>
      <Button
        disabled={hasPassword === null}
        label={isEnabled ? 'Turn off' : 'Set up'}
        variant={isEnabled ? 'outlined' : 'filled'}
        onPress={() =>
          setStep({
            kind: 'password',
            purpose: isEnabled ? 'disable' : 'enable',
          })
        }
      />
    </NativeScreen>
  );
}
