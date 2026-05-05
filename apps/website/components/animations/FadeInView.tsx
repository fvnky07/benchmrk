// NOTE: Scroll-triggered fade/slide wrapper using motion + useInView
'use client';

import type { Variants } from 'motion/react';

import { domAnimation, LazyMotion, m, useInView } from 'motion/react';
import { useRef } from 'react';

import { DURATION, EASE } from '@/lib/animation-config';

interface FadeInViewProps {
  children: React.ReactNode;
  /** Custom variants — defaults to fadeUpVariants */
  variants?: Variants;
  /** Extra delay before animation starts (seconds) */
  delay?: number;
  /** Amount of element visible before triggering (0-1) */
  amount?: number;
  /** Only animate once when entering viewport */
  once?: boolean;
  /** Additional className */
  className?: string;
  /** Override direction: 'up' | 'down' | 'left' | 'right' | 'none' */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Override travel distance in pixels */
  distance?: number;
}

export function FadeInView({
  children,
  variants,
  delay = 0,
  amount = 0.3,
  once = true,
  className,
  direction = 'up',
  distance = 30,
}: Readonly<FadeInViewProps>) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount });

  // NOTE: Build directional variants if no custom ones provided
  const resolvedVariants: Variants = variants ?? {
    hidden: {
      opacity: 0,
      ...(direction === 'up' && { y: distance }),
      ...(direction === 'down' && { y: -distance }),
      ...(direction === 'left' && { x: distance }),
      ...(direction === 'right' && { x: -distance }),
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        duration: DURATION.normal,
        ease: EASE.expOut,
        delay,
      },
    },
  };

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        ref={ref}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={resolvedVariants}
        className={className}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
