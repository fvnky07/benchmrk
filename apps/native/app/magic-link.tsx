import { Button } from '@expo/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { AuthShell, AuthStatus } from '@/components/native/auth-shell';
import { completeMagicLinkSignIn, useAuth } from '@/lib/auth';

/**
 * Where a native sign-in link lands (`native://magic-link`). A verified link
 * carries the session as `cookie`; an invalid or expired one carries `error`.
 */
export default function MagicLinkScreen() {
  const { cookie, error } = useLocalSearchParams<{
    cookie?: string;
    error?: string;
  }>();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (cookie && !error) completeMagicLinkSignIn(cookie);
  }, [cookie, error]);

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated]);

  if (error || !cookie) {
    return (
      <AuthShell
        title="This sign-in link didn’t work"
        supportingText="It may have expired or already been used. Ask for a new one from Log in."
      >
        <Button
          label="Back to log in"
          onPress={() => router.replace('/login')}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Signing you in"
      supportingText="Your sign-in link worked."
    >
      <AuthStatus message="Loading your Benchmrk identity…" />
    </AuthShell>
  );
}
