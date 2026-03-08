'use client';

import { domAnimation, LazyMotion, m } from 'motion/react';

import { cn } from '@/lib/utils';

interface LineShadowTextProps extends React.ComponentProps<typeof m.span> {
  shadowColor?: string;
}

// NOTE: Uses m.span directly to avoid component creation during render
// FIX: Replaced motion.create() pattern with static m.span component
export function LineShadowText({
  children,
  shadowColor = 'black',
  className,
  ...props
}: LineShadowTextProps) {
  const content = typeof children === 'string' ? children : null;

  if (!content) {
    throw new Error('LineShadowText only accepts string content');
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.span
        style={{ '--shadow-color': shadowColor } as React.CSSProperties}
        className={cn(
          'relative z-0 inline-flex',
          'after:absolute after:top-[0.04em] after:left-[0.04em] after:content-[attr(data-text)]',
          'after:bg-[linear-gradient(45deg,transparent_45%,var(--shadow-color)_45%,var(--shadow-color)_55%,transparent_0)]',
          'after:-z-10 after:bg-[length:0.06em_0.06em] after:bg-clip-text after:text-transparent',
          'after:animate-line-shadow',
          className
        )}
        data-text={content}
        {...props}
      >
        {content}
      </m.span>
    </LazyMotion>
  );
}
