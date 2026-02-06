'use client';

import Hero from '@/components/sections/landing/hero';
import WaitingList from '@/components/sections/landing/waiting-list';
import { FloatingNavbar } from '@/components/ui/floating-navbar';
import Image from 'next/image';
import LogoSvg from '@/public/logo.svg';

export default function LandingPage() {
  // NOTE: Structured data (JSON-LD) for rich search results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://benchmrk.app/#organization',
        name: 'benchmrk',
        url: 'https://benchmrk.app',
        logo: {
          '@type': 'ImageObject',
          url: 'https://benchmrk.app/opengraph-image',
        },
        sameAs: ['https://x.com/fvnky_07'],
      },
      {
        '@type': 'WebApplication',
        '@id': 'https://benchmrk.app/#webapp',
        name: 'benchmrk',
        url: 'https://benchmrk.app',
        applicationCategory: 'HealthApplication',
        operatingSystem: 'iOS, Android',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '5.0',
          ratingCount: '1',
        },
        description:
          'AI-powered fitness tracker with intelligent coaching, lightning-fast workout logging, and in-depth analytics.',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://benchmrk.app/#website',
        url: 'https://benchmrk.app',
        name: 'benchmrk',
        publisher: {
          '@id': 'https://benchmrk.app/#organization',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* NOTE: Floating navbar appears when user scrolls down */}
      <FloatingNavbar
        backgroundColor="bg-black-2"
        ctaText="Join the Waitlist!"
        onCtaClick={() => {
          document
            .getElementById('waitlist')
            ?.scrollIntoView({ behavior: 'smooth' });
        }}
        logo={
          <Image
            src={LogoSvg}
            alt="logo"
            width={32}
            height={32}
            className="relative h-25 w-20 md:bottom-1.5 md:h-12 md:w-12"
          />
        }
        scrollThreshold={100}
      />
      <main className="debug bg-black-2 flex w-full flex-col items-center justify-center">
        <Hero />
        <WaitingList />
      </main>
    </>
  );
}
