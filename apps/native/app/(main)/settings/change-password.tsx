import { Button, ListItem, Text } from '@expo/ui';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { NativeScreen } from '@/components/native/native-screen';
import { NativeTextField } from '@/components/native/native-text-field';
import { authClient } from '@/lib/auth/client';
import { useFormValidation } from '@/lib/hooks/use-form-validation';
import { changePasswordSchema } from '@/lib/schemas/auth';

export default function ChangePasswordScreen() {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [isCheckingPassword, setIsCheckingPassword] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const { errors, handleSubmit, clearError, hasSubmitted } = useFormValidation({
    schema: changePasswordSchema,
    mode: 'onChange',
  });

  const checkPasswordStatus = useCallback(async () => {
    setIsCheckingPassword(true);
    setErrorMessage(null);
    try {
      const { data, error } = await authClient.listAccounts();
      if (error) throw new Error('Could not check password status');
      setHasPassword(
        (data ?? []).some((account) => account.providerId === 'credential')
      );
    } catch {
      setHasPassword(null);
      setErrorMessage(
        'Couldn’t check whether a password is set. Check your connection and try again.'
      );
    } finally {
      setIsCheckingPassword(false);
    }
  }, []);

  useEffect(() => {
    void checkPasswordStatus();
  }, [checkPasswordStatus]);

  if (hasPassword === null) {
    return (
      <NativeScreen>
        {errorMessage ? (
          <>
            <Text textStyle={{ fontSize: 17 }}>{errorMessage}</Text>
            <Button
              disabled={isCheckingPassword}
              label={isCheckingPassword ? 'Checking…' : 'Try again'}
              onPress={() => void checkPasswordStatus()}
            />
          </>
        ) : (
          <Text textStyle={{ fontSize: 17 }}>Loading…</Text>
        )}
      </NativeScreen>
    );
  }

  if (!hasPassword) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
          No password to change
        </Text>
        <ListItem supportingText="You sign in with Apple or Google, so your provider secures sign-in. There is no Benchmrk password to change.">
          Password
        </ListItem>
      </NativeScreen>
    );
  }

  const submit = () => {
    setErrorMessage(null);
    handleSubmit(
      { currentPassword, newPassword, confirmPassword },
      async () => {
        try {
          setIsSaving(true);
          const { error } = await authClient.changePassword({
            currentPassword,
            newPassword,
          });
          if (error) {
            setErrorMessage(
              error.code === 'INVALID_PASSWORD'
                ? 'Your current password is incorrect.'
                : 'Couldn’t change your password. Try again.'
            );
            setCurrentPassword('');
            return;
          }
          setIsDone(true);
        } catch {
          setErrorMessage(
            'Couldn’t change your password. Check your connection and try again.'
          );
        } finally {
          setIsSaving(false);
        }
      }
    );
  };

  if (isDone) {
    return (
      <NativeScreen>
        <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
          Password changed
        </Text>
        <ListItem supportingText="Your other devices were signed out. This one stays signed in.">
          Done
        </ListItem>
        <Button label="Back to Manage Account" onPress={() => router.back()} />
      </NativeScreen>
    );
  }

  return (
    <NativeScreen>
      <Text textStyle={{ fontSize: 28, fontWeight: '700' }}>
        Change password
      </Text>
      <Text textStyle={{ fontSize: 17 }}>
        Changing it signs out your other devices.
      </Text>
      <NativeTextField
        autoCapitalize="none"
        autoComplete="current-password"
        error={errors.currentPassword}
        label="Current password"
        secureTextEntry
        value={currentPassword}
        onChangeText={(value) => {
          setCurrentPassword(value);
          if (hasSubmitted) clearError('currentPassword');
        }}
      />
      <NativeTextField
        autoCapitalize="none"
        autoComplete="new-password"
        error={errors.newPassword}
        label="New password"
        secureTextEntry
        value={newPassword}
        onChangeText={(value) => {
          setNewPassword(value);
          if (hasSubmitted) clearError('newPassword');
        }}
      />
      <NativeTextField
        autoCapitalize="none"
        autoComplete="new-password"
        error={errors.confirmPassword}
        label="Confirm new password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          if (hasSubmitted) clearError('confirmPassword');
        }}
      />
      {errorMessage ? (
        <ListItem supportingText={errorMessage}>Password not changed</ListItem>
      ) : null}
      <Button
        disabled={isSaving}
        label={isSaving ? 'Changing…' : 'Change password'}
        onPress={submit}
      />
    </NativeScreen>
  );
}
