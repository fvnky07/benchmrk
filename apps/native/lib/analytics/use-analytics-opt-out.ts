import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { useEffect } from 'react';

import { posthog } from './posthog';

/** Applies the signed-in member's analytics opt-out to PostHog. */
export function useAnalyticsOptOut(isAuthenticated: boolean) {
  const settings = useQuery(
    api.memberSettings.get,
    isAuthenticated ? {} : 'skip'
  );
  const optedOut = settings?.analyticsOptOut;

  useEffect(() => {
    if (!posthog || optedOut === undefined) return;
    if (optedOut) {
      posthog.optOut();
    } else {
      posthog.optIn();
    }
  }, [optedOut]);
}
