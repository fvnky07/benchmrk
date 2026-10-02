import { Button, Column, ListItem } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { useState } from 'react';

import { authClient } from '@/lib/auth/client';
import { authErrorCopy } from '@/lib/auth/error-copy';

type Resend =
  | { state: 'idle' | 'sending' | 'sent' }
  | { state: 'failed'; code: string | null };

/** The member's email, whether it is verified, and a way to resend the link. */
export function EmailVerificationRow() {
  const verification = useQuery(api.auth.getEmailVerification);
  const [resendStatus, setResendStatus] = useState<Resend>({ state: 'idle' });

  if (!verification) return null;

  if (verification.emailVerified) {
    return (
      <ListItem supportingText={`${verification.email} · Verified`}>
        Email
      </ListItem>
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
    <Column spacing={8}>
      <ListItem
        supportingText={`${verification.email} · Not verified. Verify it to create or join Groups and to recover your password.`}
      >
        Email
      </ListItem>
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
      {resendStatus.state === 'failed' ? (
        <ListItem
          supportingText={authErrorCopy(
            resendStatus.code,
            'Couldn’t send it. Check your connection and try again.'
          )}
        >
          Not sent
        </ListItem>
      ) : null}
    </Column>
  );
}
