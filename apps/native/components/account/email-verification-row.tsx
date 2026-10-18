import { Button, Column } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { useState } from 'react';

import { CardRow } from '@/components/native/card';
import { authClient } from '@/lib/auth/client';
import { authErrorCopy } from '@/lib/auth/error-copy';
import { space } from '@/lib/ui';

type Resend =
  | { state: 'idle' | 'sending' | 'sent' }
  | { state: 'failed'; code: string | null };

/**
 * The member's email, whether it is verified, and a way to resend the link.
 * Rows are transparent `CardRow`s, so place it inside a `Card`.
 */
export function EmailVerificationRow() {
  const verification = useQuery(api.auth.getEmailVerification);
  const [resendStatus, setResendStatus] = useState<Resend>({ state: 'idle' });

  if (!verification) return null;

  if (verification.emailVerified) {
    return (
      <CardRow supportingText={`${verification.email} · Verified`}>
        Email
      </CardRow>
    );
  }

  const resend = async () => {
    setResendStatus({ state: 'sending' });
    const { error } = await authClient.sendVerificationEmail({
      email: verification.email,
      callbackURL: 'native://email-verified',
    });
    setResendStatus(
      error ? { state: 'failed', code: error.code ?? null } : { state: 'sent' }
    );
  };

  return (
    <Column>
      <CardRow
        supportingText={`${verification.email} · Not verified. Verify it to create or join Groups and to recover your password.`}
      >
        Email
      </CardRow>
      <Column style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
        <Button
          disabled={resendStatus.state === 'sending'}
          label={
            resendStatus.state === 'sending'
              ? 'Sending…'
              : resendStatus.state === 'sent'
                ? 'Verification email sent'
                : 'Resend verification email'
          }
          variant="outlined"
          onPress={() => void resend()}
        />
      </Column>
      {resendStatus.state === 'failed' ? (
        <CardRow
          supportingText={authErrorCopy(
            resendStatus.code,
            'Couldn’t send it. Check your connection and try again.'
          )}
        >
          Not sent
        </CardRow>
      ) : null}
    </Column>
  );
}
