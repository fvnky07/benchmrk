// app/PostHogPageview.tsx
'use client';

import { useEffect, Suspense, useRef } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

import posthog from 'posthog-js';

function PostHogPageviewContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Scroll depth tracking refs
  const maxScrollY = useRef(0);
  const maxScrollPercentage = useRef(0);

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture('$pageview', {
        $current_url: url,
      });

      // Reset scroll depth for new pageview
      maxScrollY.current = 0;
      maxScrollPercentage.current = 0;
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const documentHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const scrollPercentage =
        documentHeight > 0 ? (scrollY / documentHeight) * 100 : 0;

      if (scrollY > maxScrollY.current) {
        maxScrollY.current = scrollY;
      }
      if (scrollPercentage > maxScrollPercentage.current) {
        maxScrollPercentage.current = scrollPercentage;
      }
    };

    const handlePageLeave = () => {
      if (posthog) {
        posthog.capture('$pageleave', {
          $current_url: window.location.href,
          max_scroll_y: Math.round(maxScrollY.current),
          max_scroll_percentage: Math.round(maxScrollPercentage.current),
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', handlePageLeave);

    return () => {
      handlePageLeave(); // Also capture on component unmount
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handlePageLeave);
    };
  }, []);

  return null;
}

export default function PostHogPageview() {
  return (
    <Suspense fallback={null}>
      <PostHogPageviewContent />
    </Suspense>
  );
}
