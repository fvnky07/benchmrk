'use client';

import { api } from '@repo/backend/convex/_generated/api';
import { useAction } from 'convex/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type Status = 'ready' | 'confirming' | 'confirmed' | 'invalid';

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
    } catch {
      setStatus('invalid');
    }
  };

  if (status === 'confirmed') {
    return (
      <p role="status" className="text-muted-foreground">
        Your request is confirmed. We&apos;ll delete your account within 30 days
        and email you when it&apos;s done.
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
        Confirm to ask us to delete your benchmrk account and all its data.
      </p>
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
