import type { NextConfig } from 'next';

import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/ingest/:path*',
        destination: `${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'}/:path*`,
      },
    ];
  },
};

export default withMDX(nextConfig);
