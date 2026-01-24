import Hero from '@/components/sections/landing/hero';

export default function LandingPage() {
  return (
    <div className="bg-black-2 flex min-h-screen items-center justify-center">
      <main className="bg-black-1 max-w-vw m-6 flex min-h-screen w-full flex-col items-center justify-between border-2 border-red-600 bg-white p-6 sm:items-start dark:bg-black">
        <Hero />
      </main>
    </div>
  );
}
