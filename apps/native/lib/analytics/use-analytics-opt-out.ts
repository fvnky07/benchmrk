import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth';

import { identifyUser, posthog, setAnalyticsEnabled } from './posthog';

/** Applies the signed-in member's analytics opt-out to PostHog. */
export function useAnalyticsOptOut(isAuthenticated: boolean) {
  const { user } = useAuth();
  const settings = useQuery(
    api.memberSettings.get,
    isAuthenticated ? {} : 'skip'
  );
  const optedOut = settings?.analyticsOptOut;

  useEffect(() => {
    let cancelled = false;
    setAnalyticsEnabled(false);
    if (!posthog || !isAuthenticated || optedOut !== false || !user) {
      void posthog?.optOut();
      return;
    }
    void posthog.optIn().then(() => {
      if (cancelled) return;
      setAnalyticsEnabled(true);
      identifyUser(user.id, {
        email: user.email ?? '',
        name: user.name ?? '',
      });
    });
    return () => {
      cancelled = true;
      setAnalyticsEnabled(false);
      void posthog?.optOut();
    };
  }, [isAuthenticated, optedOut, user]);
}
