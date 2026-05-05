'use client';

import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useScroll,
} from 'motion/react';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

import {
  Navbar,
  type NavbarCustomStyles,
  type NavbarProps,
} from '@/components/ui/navbar';
import { DURATION, EASE } from '@/lib/animation-config';

interface FloatingNavbarProps
  extends Omit<NavbarProps, 'backgroundColor' | 'variant'> {
  threshold?: number;
  customStyles?: NavbarCustomStyles;
  hideOnScrollDown?: boolean;
}

export const FloatingNavbar = React.forwardRef<
  HTMLElement,
  FloatingNavbarProps
>(
  (
    { threshold = 0, hideOnScrollDown = false, customStyles, ...navbarProps },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(threshold === 0);
    const prevScrollYRef = useRef(0);
    const { scrollY } = useScroll();

    // NOTE: Merge black borders for badges and Twitter button with custom styles
    const floatingNavbarStyles = React.useMemo(
      () => ({
        ...customStyles,
        badgeBorder: 'border-black',
        iconButtonBorder: 'border-black',
        badgeTextColor: 'text-black', // Black text on white floating navbar
        iconButtonImage: '/x-light.svg', // Black X logo for white background
      }),
      [customStyles]
    );

    useEffect(() => {
      // NOTE: If threshold is 0 and no directional scrolling, no tracking needed
      if (threshold === 0 && !hideOnScrollDown) {
        return;
      }

      // NOTE: Track scroll position for threshold-based and directional visibility
      const unsubscribe = scrollY.on('change', (latest) => {
        const pastThreshold = latest > threshold;
        const scrollingUp = hideOnScrollDown && latest < prevScrollYRef.current;
        const scrollingDown =
          hideOnScrollDown && latest > prevScrollYRef.current;

        if (hideOnScrollDown) {
          prevScrollYRef.current = latest;
        }

        setIsVisible((prev) => {
          if (!hideOnScrollDown) return pastThreshold;
          if (scrollingUp && pastThreshold) return true;
          if (scrollingDown && latest > 50) return false;
          if (latest < 50) return threshold === 0 || pastThreshold;
          return prev;
        });
      });

      return () => unsubscribe();
    }, [scrollY, threshold, hideOnScrollDown]);

    return (
      <LazyMotion features={domAnimation}>
        <AnimatePresence mode="wait">
          {isVisible && (
            <m.div
              key="floating-navbar"
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{
                duration: DURATION.fast,
                ease: EASE.expOut,
              }}
              className="fixed top-0 right-0 left-0 z-[100] w-full"
            >
              <Navbar
                ref={ref}
                {...navbarProps}
                variant="light"
                customStyles={floatingNavbarStyles}
                noPadding
                className="rounded-none rounded-b-4xl border-none shadow-xl"
              />
            </m.div>
          )}
        </AnimatePresence>
      </LazyMotion>
    );
  }
);

FloatingNavbar.displayName = 'FloatingNavbar';
