// app/PostHogPageview.tsx
'use client';

import { useEffect, Suspense } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import posthog from 'posthog-js';

function PostHogPageviewContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export default function PostHogPageview() {
  return (
    <Suspense fallback={null}>
      <PostHogPageviewContent />
    </Suspense>
  );
}
