import { Button, Column, Row, Text } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Card, CardRow } from '@/components/native/card';
import { SectionHeader } from '@/components/native/section-header';
import { authClient } from '@/lib/auth/client';
import {
  isAppleAvailable,
  isGoogleAvailable,
  runSocialAuth,
  type SocialProvider,
} from '@/lib/auth/social';
import { font, space, textColor, useColors } from '@/lib/ui';

type Method = 'credential' | SocialProvider;

const METHOD_LABEL: Record<Method, string> = {
  credential: 'Email and password',
  apple: 'Apple',
  google: 'Google',
};

async function fetchLinkedMethods(): Promise<Method[]> {
  const { data } = await authClient.listAccounts();
  return (data ?? [])
    .map((account) => account.providerId)
    .filter(
      (provider): provider is Method =>
        provider === 'credential' ||
        provider === 'apple' ||
        provider === 'google'
    );
}

/**
 * Every way the member can sign in. Providers are linked explicitly (ADR 0001)
 * and the last remaining method can't be unlinked. Renders its own "Sign-in
 * methods" heading and card.
 */
export function SignInMethods() {
  const colors = useColors();
  const config = useQuery(api.auth.getSocialAuthConfig);
  const [linked, setLinked] = useState<Method[] | null>(null);
  const [appleNative, setAppleNative] = useState(false);
  const [busy, setBusy] = useState<Method | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void AppleAuthentication.isAvailableAsync().then(setAppleNative);
      fetchLinkedMethods()
        .then((methods) => active && setLinked(methods))
        .catch(() => active && setLinked([]));
      return () => {
        active = false;
      };
    }, [])
  );

  const run = async (method: Method, action: () => Promise<string | null>) => {
    setBusy(method);
    setErrorMessage(null);
    try {
      const failure = await action();
      if (failure) setErrorMessage(failure);
      setLinked(await fetchLinkedMethods());
    } catch {
      setErrorMessage('Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const link = (provider: SocialProvider) =>
    run(provider, async () => {
      if (!config) return 'Sign-in options are still loading.';
      const result = await runSocialAuth(provider, config, true);
      return result.status === 'failure' ? result.message : null;
    });

  const unlink = (method: SocialProvider) =>
    run(method, async () => {
      const { error } = await authClient.unlinkAccount({ providerId: method });
      if (!error) return null;
      return error.code === 'FAILED_TO_UNLINK_LAST_ACCOUNT'
        ? 'You can’t remove your only way to sign in.'
        : `Couldn’t unlink ${METHOD_LABEL[method]}.`;
    });

  if (linked === null) {
    return (
      <Column spacing={space.sm}>
        <SectionHeader title="Sign-in methods" />
        <Card padding={space.lg}>
          <Text
            textStyle={{
              ...font.caption,
              color: textColor(colors.onSurfaceVariant),
            }}
          >
            Loading sign-in methods…
          </Text>
        </Card>
      </Column>
    );
  }

  const isOnlyMethod = linked.length === 1;
  const linkable = (['apple', 'google'] as SocialProvider[]).filter(
    (provider) =>
      !linked.includes(provider) &&
      (provider === 'apple'
        ? isAppleAvailable(config, appleNative)
        : isGoogleAvailable(config))
  );

  return (
    <Column spacing={space.sm}>
      <SectionHeader title="Sign-in methods" />
      <Card divided>
        {linked.map((method) => (
          <CardRow
            key={method}
            supportingText={
              isOnlyMethod
                ? 'Your only way to sign in, so it can’t be removed.'
                : 'Linked'
            }
            trailing={
              method === 'credential' ? undefined : (
                <Button
                  disabled={busy !== null || isOnlyMethod}
                  label={
                    busy === method
                      ? 'Unlinking…'
                      : `Unlink ${METHOD_LABEL[method]}`
                  }
                  variant="text"
                  onPress={() => void unlink(method)}
                />
              )
            }
          >
            {METHOD_LABEL[method]}
          </CardRow>
        ))}
      </Card>
      {linkable.length > 0 ? (
        <Row spacing={space.sm}>
          {linkable.map((provider) => (
            <Button
              key={provider}
              disabled={busy !== null}
              label={
                busy === provider
                  ? `Linking ${METHOD_LABEL[provider]}…`
                  : `Link ${METHOD_LABEL[provider]}`
              }
              variant="outlined"
              onPress={() => void link(provider)}
            />
          ))}
        </Row>
      ) : null}
      {errorMessage ? (
        <Card>
          <CardRow supportingText={errorMessage}>
            Couldn’t change sign-in
          </CardRow>
        </Card>
      ) : null}
    </Column>
  );
}
