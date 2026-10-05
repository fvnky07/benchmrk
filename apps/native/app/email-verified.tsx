import { Button } from '@expo/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { AuthShell } from '@/components/native/auth-shell';
import { storeLinkedSession } from '@/lib/auth/client';

/**
 * Where a verification link lands (`native://email-verified`). A verified
 * link may carry the session as `cookie`; an invalid one carries `error`.
 */
export default function EmailVerifiedScreen() {
  const { cookie, error } = useLocalSearchParams<{
    cookie?: string;
    error?: string;
  }>();

  useEffect(() => {
    if (cookie && !error) storeLinkedSession(cookie);
  }, [cookie, error]);

  return error ? (
    <AuthShell
      title="This verification link didn’t work"
      supportingText="It may have expired or already been used. Ask for a new one from Settings → Manage account."
    >
      <Button label="Continue" onPress={() => router.replace('/')} />
    </AuthShell>
  ) : (
    <AuthShell
      title="Email verified"
      supportingText="You can now create and join Groups, and recover your password if you need to."
    >
      <Button label="Continue" onPress={() => router.replace('/')} />
    </AuthShell>
  );
}
