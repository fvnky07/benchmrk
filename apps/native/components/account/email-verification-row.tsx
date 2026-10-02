import { Button, Column, ListItem } from '@expo/ui';
import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { useState } from 'react';

import { authClient } from '@/lib/auth';

/** The member's email, whether it is verified, and a way to resend the link. */
export function EmailVerificationRow() {
  const verification = useQuery(api.auth.getEmailVerification);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>(
    'idle'
  );

  if (!verification) return null;

  if (verification.emailVerified) {
    return (
      <ListItem supportingText={`${verification.email} · Verified`}>
        Email
      </ListItem>
    );
  }

  const resend = async () => {
    setStatus('sending');
    const { error } = await authClient.sendVerificationEmail({
      email: verification.email,
      callbackURL: 'native://email-verified',
    });
    setStatus(error ? 'failed' : 'sent');
  };

  return (
    <Column spacing={8}>
      <ListItem
        supportingText={`${verification.email} · Not verified. Verify it to create or join Groups and to recover your password.`}
      >
        Email
      </ListItem>
      <Button
        disabled={status === 'sending'}
        label={
          status === 'sending'
            ? 'Sending…'
            : status === 'sent'
              ? 'Verification email sent'
              : 'Resend verification email'
        }
        variant="outlined"
        onPress={() => void resend()}
      />
      {status === 'failed' ? (
        <ListItem supportingText="Couldn’t send it. Check your connection and try again.">
          Not sent
        </ListItem>
      ) : null}
    </Column>
  );
}
