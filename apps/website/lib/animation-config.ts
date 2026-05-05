// NOTE: Centralized animation configuration for Motion
// All animations use exponential bezier curves for a premium feel
import type { Variants } from 'motion/react';

// NOTE: Exponential bezier curves for smooth, premium animations
export const EASE = {
  // Primary exponential ease-out — fast start, smooth deceleration
  expOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
  // Exponential ease-in-out — smooth both ends
  expInOut: [0.87, 0, 0.13, 1] as [number, number, number, number],
  // Exponential ease-in — slow start, fast end
  expIn: [0.7, 0, 0.84, 0] as [number, number, number, number],
  // Gentle exponential for subtle animations
  gentle: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

// NOTE: Timing constants to keep animations consistent
export const DURATION = {
  fast: 0.3,
  normal: 0.5,
  slow: 0.8,
  slower: 1,
  slowest: 1.2,
};

// NOTE: Fade up from below — most common entrance animation
export const fadeUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASE.expOut,
    },
  },
};

// NOTE: Fade in without movement
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION.normal,
      ease: EASE.gentle,
    },
  },
};

// NOTE: Slide up from further below — for hero elements
export const slideUpVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 100,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.slow,
      ease: EASE.expOut,
    },
  },
};

// NOTE: Scale in from slightly smaller — for cards and panels
export const scaleInVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: DURATION.normal,
      ease: EASE.expOut,
    },
  },
};

// NOTE: Word reveal — each word fades up individually
export const wordRevealContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

export const wordRevealChildVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.fast,
      ease: EASE.expOut,
    },
  },
};

// NOTE: Slide in from left — for alternating side reveals
export const slideFromLeftVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -80,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATION.slow,
      ease: EASE.expOut,
    },
  },
};

// NOTE: Slide in from right
export const slideFromRightVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 80,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATION.slow,
      ease: EASE.expOut,
    },
  },
};

// NOTE: Hero title word reveal — dramatic staggered word entrance
export const heroTitleContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const heroTitleWordVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 48,
    filter: 'blur(8px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: DURATION.slow,
      ease: EASE.expOut,
    },
  },
};

// NOTE: Typewriter character reveal — fast per-character opacity with expInOut
export const typewriterContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.022,
      delayChildren: 0.9,
    },
  },
};

export const typewriterCharVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.08,
      ease: EASE.expInOut,
    },
  },
};

// NOTE: Bounce entrance — for trophy/celebration elements
export const bounceInVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -50,
    scale: 0,
    rotate: -180,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: {
      duration: DURATION.slow,
      ease: EASE.expOut,
    },
  },
};
