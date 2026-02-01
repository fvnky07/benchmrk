import type { Metadata } from 'next';
import Hero from '@/components/sections/landing/hero';
import WaitingList from '@/components/sections/landing/waiting-list';

// NOTE: Landing page specific metadata
export const metadata: Metadata = {
  title: 'Home',
  alternates: {
    canonical: 'https://benchmrk.app',
  },
};

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
      <main className="debug bg-black-2 flex w-full flex-col items-center justify-center">
        <Hero />
        <WaitingList />
      </main>
    </>
  );
}
