// NOTE: Welcome page shown after user confirms via magic link
import type { Metadata } from 'next';

import WelcomeContent from './WelcomeContent';

export const metadata: Metadata = {
  title: 'Welcome to benchmrk',
  description: 'Your email is confirmed and you are on the benchmrk waitlist.',
};

export default function WelcomePage() {
  return <WelcomeContent />;
}
