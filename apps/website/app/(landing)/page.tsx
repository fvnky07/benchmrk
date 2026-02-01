import Hero from '@/components/sections/landing/hero';
import Features from '@/components/sections/landing/features';
import WaitingList from '@/components/sections/landing/waiting-list';

export default function LandingPage() {
  return (
    <main className="debug bg-black-2 flex w-full flex-col items-center justify-center">
      <Hero />
      <Features />
      <WaitingList />
    </main>
  );
}
