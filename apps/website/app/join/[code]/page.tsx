import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join a Group',
  robots: { index: false },
};

/** A shared Group link: shows the code and hands over to the app. */
export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const safeCode = code
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 12)
    .toUpperCase();

  return (
    <main className="container mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="font-bold text-4xl">Join a benchmrk Group</h1>
      <p className="text-muted-foreground">
        Open this link on the phone where benchmrk is installed, or enter the
        code in the app under Workouts &gt; Group.
      </p>
      <p className="font-bold font-mono text-5xl tracking-widest">{safeCode}</p>
      <a
        className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
        href={`native://join/${safeCode}`}
      >
        Open in benchmrk
      </a>
    </main>
  );
}
