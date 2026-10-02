'use client';

import { api } from '@repo/backend/convex/_generated/api';
import { useAction } from 'convex/react';
import { ConvexError } from 'convex/values';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

type Status = 'idle' | 'sending' | 'sent' | 'error' | 'undelivered';

export default function DeletionRequestForm() {
  const requestDeletion = useAction(api.deletionRequests.request);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('sending');
    try {
      await requestDeletion({ email });
      setStatus('sent');
    } catch (error) {
      setStatus(
        error instanceof ConvexError && error.data === 'EMAIL_DELIVERY_FAILED'
          ? 'undelivered'
          : 'error'
      );
    }
  };

  if (status === 'sent') {
    return (
      <p role="status">
        If that email belongs to a Benchmrk identity, a confirmation link is on
        its way. Open it within 24 hours to send the request.
      </p>
    );
  }

  return (
    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
      <Input
        aria-label="Email"
        autoComplete="email"
        className="h-11"
        disabled={status === 'sending'}
        placeholder="you@example.com"
        required
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Button
        className="h-11"
        disabled={status === 'sending'}
        type="submit"
        variant="destructive"
      >
        {status === 'sending' && <Spinner data-icon="inline-start" />}
        Request deletion
      </Button>
      {status === 'error' && (
        <p className="text-destructive text-sm" role="alert">
          Check the email address and try again.
        </p>
      )}
      {status === 'undelivered' && (
        <p className="text-destructive text-sm" role="alert">
          We couldn’t send the email. Try again.
        </p>
      )}
    </form>
  );
}
