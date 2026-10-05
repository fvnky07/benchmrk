import { Button } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useMutation } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { AuthShell, AuthStatus } from '@/components/native/auth-shell';
import { useAuth } from '@/lib/auth/hooks';
import { errorCode } from '@/lib/workout/format';

const ERROR_COPY: Record<string, string> = {
  EMAIL_NOT_VERIFIED: 'Verify your email in Manage Account to join Groups.',
  IN_ANOTHER_GROUP:
    'You’re already in a Group. Leave it first, then open the link again.',
  GROUP_FULL: 'This Group is full: Groups hold up to 20 members.',
  CODE_INVALID: 'This Group has ended or the link expired.',
};

/** Where a shared Group link lands (`native://join/<code>`): joining is immediate. */
export default function JoinGroupScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const joinByCode = useMutation(api.groups.joinByCode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !code || attempted.current) return;
    attempted.current = true;
    joinByCode({ code })
      .then(() => router.replace('/workout/group'))
      .catch((error: unknown) =>
        setErrorMessage(
          ERROR_COPY[errorCode(error) ?? ''] ?? 'Couldn’t join this Group.'
        )
      );
  }, [code, isAuthenticated, joinByCode]);

  if (!isLoading && !isAuthenticated) {
    return (
      <AuthShell
        title="Join a Group"
        supportingText="Log in to benchmrk, then open the link again."
      >
        <Button label="Log in" onPress={() => router.replace('/login')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Join a Group" supportingText={`Code ${code ?? ''}`}>
      {errorMessage ? (
        <>
          <AuthStatus message={errorMessage} tone="error" />
          <Button label="Back" onPress={() => router.replace('/')} />
        </>
      ) : (
        <AuthStatus message="Joining…" />
      )}
    </AuthShell>
  );
}
