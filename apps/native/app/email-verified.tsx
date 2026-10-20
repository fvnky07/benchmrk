import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { AuthShell, useAuthColumnWidth } from '@/components/native/auth-shell';
import { PrimaryButton } from '@/components/native/primary-button';
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
  const columnWidth = useAuthColumnWidth();

  useEffect(() => {
    if (cookie && !error) storeLinkedSession(cookie);
  }, [cookie, error]);

  return error ? (
    <AuthShell
      title="This verification link didn’t work"
      supportingText="It may have expired or already been used. Ask for a new one from Settings → Manage account."
    >
      <PrimaryButton
        label="Continue"
        width={columnWidth}
        onPress={() => router.replace('/')}
      />
    </AuthShell>
  ) : (
    <AuthShell
      title="Email verified"
      supportingText="You can now create and join Groups, and recover your password if you need to."
    >
      <PrimaryButton
        label="Continue"
        width={columnWidth}
        onPress={() => router.replace('/')}
      />
    </AuthShell>
  );
}
