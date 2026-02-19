import type { Metadata } from 'next';

import { AboutContent } from './about-content';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Meet the team behind benchmrk and learn why we started building AI-powered fitness tracking.',
};

export default function AboutPage() {
  return <AboutContent />;
}
