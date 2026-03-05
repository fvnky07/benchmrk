import path from 'path';

import type { NextConfig } from 'next';

import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

const nextConfig: NextConfig = {
  turbopack: {
    // Point to monorepo root so Turbopack can resolve packages from node_modules/.pnpm
    root: path.resolve(__dirname, '../..'),
  },
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
