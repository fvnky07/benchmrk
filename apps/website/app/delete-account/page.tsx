import type { Metadata } from 'next';

import DeletionRequestForm from './DeletionRequestForm';

export const metadata: Metadata = {
  title: 'Delete your Benchmrk identity',
  description:
    'How to delete your Benchmrk identity and data, in the app or from this page.',
};

export default function DeleteAccountPage() {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-16">
      <div className="flex flex-col gap-8">
        <h1 className="font-bold text-4xl md:text-5xl">
          Delete your Benchmrk identity
        </h1>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-2xl">In the app</h2>
          <ol className="list-decimal space-y-1 pl-6 text-muted-foreground">
            <li>Open benchmrk and go to Settings.</li>
            <li>Choose Manage Account, then Delete Account.</li>
            <li>
              Confirm. Your Benchmrk identity and data are deleted right away.
            </li>
          </ol>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-2xl">Without the app</h2>
          <p className="text-muted-foreground">
            Enter the email you signed up with. We&apos;ll send a link to
            confirm the request; nothing happens until you open it. Once
            confirmed, we delete your Benchmrk identity within 30 days and email
            you when it&apos;s done.
          </p>
          <DeletionRequestForm />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-2xl">What gets deleted</h2>
          <p className="text-muted-foreground">
            Your Benchmrk identity, profile, sign-in methods, settings,
            Exercises, Routines, Workouts and Group activity. Nothing is kept
            afterwards.
          </p>
        </section>
      </div>
    </main>
  );
}
