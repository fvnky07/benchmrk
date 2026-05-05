import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for benchmrk',
};

export default function PrivacyPage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-16">
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <h1 className="font-bold text-4xl md:text-6xl">Privacy Policy</h1>
        <p className="text-lg text-muted-foreground md:text-xl">Coming Soon</p>
        <p className="max-w-2xl text-muted-foreground text-sm">
          We are currently preparing our Privacy Policy. This page will be
          updated with detailed information about how we collect, use, and
          protect your data before our official launch.
        </p>
      </div>
    </main>
  );
}
