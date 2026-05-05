'use client';

import { Separator } from '@radix-ui/react-separator';

import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';

import { cn } from '@/lib/utils';
import LogoSvg from '@/public/logo.svg';

import { Button } from './button';
import { DotPattern } from './dot-pattern';

interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode;
}

// NOTE: Navigation links matching the navbar structure
const navigationLinks = [
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/changelog', label: 'Changelog' },
];

const legalLinks = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
];

export const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ className, ...props }, ref) => {
    const dotPatternRef = React.useRef<HTMLDivElement>(null);

    // NOTE: Forward mouse events from footer to DotPattern for hover effects
    const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
      const dotPattern = dotPatternRef.current;
      if (!dotPattern) return;

      // Dispatch a native mouse event to the DotPattern container
      const _rect = dotPattern.getBoundingClientRect();
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: e.clientX,
        clientY: e.clientY,
        bubbles: true,
      });
      dotPattern.dispatchEvent(mouseEvent);
    }, []);

    const handleMouseLeave = React.useCallback(() => {
      const dotPattern = dotPatternRef.current;
      if (!dotPattern) return;

      const mouseEvent = new MouseEvent('mouseleave', {
        bubbles: true,
      });
      dotPattern.dispatchEvent(mouseEvent);
    }, []);

    return (
      <footer
        ref={ref}
        className={cn(
          'relative w-full overflow-hidden border-border border-t py-2',
          className
        )}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {/* NOTE: DotPattern as background with custom styling for footer */}
        {/* HACK: Override fixed positioning from DotPattern to work within footer */}
        <div ref={dotPatternRef} className="absolute inset-0">
          <DotPattern
            className="!absolute inset-0 bg-gradient-to-b from-neutral-950 to-black"
            dotSize={2}
            gap={24}
            baseColor="#fff"
            glowColor="#22d3ee"
            proximity={120}
            glowIntensity={0.8}
            waveSpeed={0.3}
          />
        </div>

        {/* Overlay to ensure content visibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/80" />

        {/* Content wrapper */}
        <div className="container relative z-10 mx-auto max-w-screen-2xl py-5">
          {/* Main footer content */}
          <div className="flex flex-col gap-8 px-6 md:flex-row md:justify-between md:gap-12 md:px-12 xl:px-18">
            {/* Left: Logo + Social */}
            <div className="flex flex-col justify-start gap-4">
              <div className="flex flex-row items-center gap-1">
                <Image
                  src={LogoSvg}
                  alt="Logo"
                  className="relative bottom-2 size-16"
                />
                <h1 className="font-bold text-4xl">benchmrk</h1>
              </div>
              <div className="flex items-center md:justify-center">
                <Link
                  href="https://github.com/fvnky07/benchmrk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-row items-center gap-2 transition-opacity hover:opacity-70"
                  aria-label="View benchmrk on GitHub"
                >
                  <Button variant="outline" className="h-auto w-auto">
                    <Image
                      src="/x.svg"
                      alt="GitHub"
                      width={20}
                      height={20}
                      className="h-6 w-6"
                    />
                    <span className="pl-4 text-md">Follow us on Twitter!</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Navigation Links */}
            <div className="flex flex-row gap-8 md:gap-18">
              {/* Resources Column */}
              <div className="flex flex-col gap-4">
                <h2 className="px-4 font-semibold text-xl md:text-2xl">
                  Resources
                </h2>
                <ul className="flex flex-col gap-3 px-4">
                  {navigationLinks.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal Column */}
              <div className="flex flex-col gap-4">
                <h2 className="px-4 font-semibold text-xl md:text-2xl">
                  Legal
                </h2>
                <ul className="flex flex-col gap-3 px-4">
                  {legalLinks.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Separator */}
          <Separator className="my-4 h-px w-full bg-border" />

          {/* Copyright */}
          <div className="flex justify-center pb-2">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} benchmrk. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    );
  }
);

Footer.displayName = 'Footer';
