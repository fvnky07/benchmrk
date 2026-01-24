import Hero from '@/components/sections/landing/hero';
import Features from '@/components/sections/landing/features';
import WaitingList from '@/components/sections/landing/waiting-list';
import CTA from '@/components/sections/landing/cta';
import Layout from '@/components/sections/landing/layout';

export default function LandingPage() {
  return (
    <Layout>
      <Hero fill="#ff7878" />
      <Features />
      <WaitingList />
      <CTA />
    </Layout>
  );
}
