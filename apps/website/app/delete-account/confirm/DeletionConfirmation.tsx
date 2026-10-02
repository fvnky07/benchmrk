'use client';

import { api } from '@repo/backend/convex/_generated/api';
import { useAction } from 'convex/react';
import { ConvexError } from 'convex/values';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type Status = 'ready' | 'confirming' | 'confirmed' | 'invalid' | 'undelivered';

/** Confirms on a button press, so link scanners that open the URL don't. */
export default function DeletionConfirmation() {
  const token = useSearchParams().get('token');
  const confirmDeletion = useAction(api.deletionRequests.confirm);
  const [status, setStatus] = useState<Status>(token ? 'ready' : 'invalid');

  const confirm = async () => {
    if (!token) return;
    setStatus('confirming');
    try {
      await confirmDeletion({ token });
      setStatus('confirmed');
    } catch (error) {
      setStatus(
        error instanceof ConvexError && error.data === 'EMAIL_DELIVERY_FAILED'
          ? 'undelivered'
          : 'invalid'
      );
    }
  };

  if (status === 'confirmed') {
    return (
      <p role="status" className="text-muted-foreground">
        Your request is confirmed. We&apos;ll delete your Benchmrk identity
        within 30 days and email you when it&apos;s done.
      </p>
    );
  }

  if (status === 'invalid') {
    return (
      <p role="alert" className="text-muted-foreground">
        This link is invalid or has expired.{' '}
        <Link className="underline" href="/delete-account">
          Request a new one
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-muted-foreground">
        Confirm to ask us to delete your Benchmrk identity and all its data.
      </p>
      {status === 'undelivered' && (
        <p className="text-destructive text-sm" role="alert">
          We couldn’t send the email. Try again.
        </p>
      )}
      <Button
        disabled={status === 'confirming'}
        variant="destructive"
        onClick={confirm}
      >
        {status === 'confirming' && <Spinner data-icon="inline-start" />}
        Confirm deletion request
      </Button>
    </div>
  );
}
