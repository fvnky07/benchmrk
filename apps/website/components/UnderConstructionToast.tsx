'use client';

import { useEffect, useRef } from 'react';

import { useFeatureFlagEnabled } from 'posthog-js/react';
import { toast } from 'sonner';

const TOAST_ID = 'under-construction';

export function UnderConstructionToast() {
  const isUnderConstruction = useFeatureFlagEnabled(
    'website-under-construction'
  );
  const shownRef = useRef(false);

  useEffect(() => {
    if (isUnderConstruction) {
      if (!shownRef.current) {
        shownRef.current = true;
        toast('Website is under construction and will be ready shortly.', {
          id: TOAST_ID,
          duration: Infinity,
          position: 'bottom-center',
          description: (
            <a
              href="/#waitlist"
              className="text-primary underline underline-offset-4"
            >
              Join the waitlist for updates
            </a>
          ),
        });
      }
    } else {
      toast.dismiss(TOAST_ID);
      shownRef.current = false;
    }
  }, [isUnderConstruction]);

  // Dismiss on unmount
  useEffect(() => {
    return () => {
      toast.dismiss(TOAST_ID);
    };
  }, []);

  return null;
}
