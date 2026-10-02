import type { Metadata } from 'next';
import { Suspense } from 'react';

import DeletionConfirmation from './DeletionConfirmation';

export const metadata: Metadata = {
  title: 'Confirm your deletion request',
  robots: { index: false },
};

export default function ConfirmDeletionPage() {
  return (
    <main className="container mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center gap-4 px-4 py-16">
      <h1 className="font-bold text-4xl">Deletion request</h1>
      <Suspense>
        <DeletionConfirmation />
      </Suspense>
    </main>
  );
}
