import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for benchmrk',
};

export default function TermsPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-16">
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <h1 className="font-bold text-4xl md:text-6xl">Terms of Service</h1>
        <p className="text-lg text-muted-foreground md:text-xl">Coming Soon</p>
        <p className="max-w-2xl text-muted-foreground text-sm">
          We are currently preparing our Terms of Service. This page will be
          updated with detailed terms and conditions before our official launch.
        </p>
      </div>
    </main>
  );
}
