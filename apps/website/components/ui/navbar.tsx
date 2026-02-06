'use client';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { EASE } from '@/lib/animation-config';

// Simple logo component for the navbar
const Logo = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      aria-label="Logo"
      role="img"
      fill="none"
      height="1em"
      viewBox="0 0 324 323"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect fill="currentColor" height="323" rx="161.5" width="323" x="0.5" />
      <circle
        cx="162"
        cy="161.5"
        fill="white"
        r="60"
        className="dark:fill-black"
      />
    </svg>
  );
};

// Hamburger icon component
const HamburgerIcon = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    aria-label="Menu"
    className={cn('pointer-events-none', className)}
    fill="none"
    height={16}
    role="img"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width={16}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
      d="M4 12L20 12"
    />
    <path
      className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
      d="M4 12H20"
    />
    <path
      className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
      d="M4 12H20"
    />
  </svg>
);

// Types
export interface NavbarNavLink {
  href: string;
  label: string;
  active?: boolean;
}

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  logo?: React.ReactNode;
  logoHref?: string;
  navigationLinks?: NavbarNavLink[];
  signInText?: string;
  signInHref?: string;
  ctaText?: string;
  ctaHref?: string;
  onSignInClick?: () => void;
  onCtaClick?: () => void;
  backgroundColor?: string;
}

// Default navigation links
const defaultNavigationLinks: NavbarNavLink[] = [
  { href: '#changelog', label: 'Changelog' },
  { href: '#blog', label: 'Blog' },
  { href: '#about', label: 'About' },
  { href: '#pricing', label: 'Pricing' },
];

export const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  (
    {
      className,
      logo = <Logo />,
      // NOTE: These props are part of the public API but not yet wired up
      /* eslint-disable @typescript-eslint/no-unused-vars */
      logoHref,
      signInText,
      signInHref,
      ctaHref,
      onSignInClick,
      /* eslint-enable @typescript-eslint/no-unused-vars */
      navigationLinks = defaultNavigationLinks,
      ctaText = 'Get Started',
      onCtaClick,
      backgroundColor = 'bg-background/95',
      ...props
    },
    ref
  ) => {
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
      const checkWidth = () => {
        if (containerRef.current) {
          const width = containerRef.current.offsetWidth;
          setIsMobile(width < 768); // 768px is md breakpoint
        }
      };

      checkWidth();

      const resizeObserver = new ResizeObserver(checkWidth);
      if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    // Combine refs
    const combinedRef = React.useCallback(
      (node: HTMLElement | null) => {
        containerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    return (
      <header
        className={cn(
          'supports-backdrop-filter:bg-background/0 sticky top-0 z-50 w-full px-4 backdrop-blur **:no-underline md:px-6 xl:px-4',
          backgroundColor,
          className
        )}
        ref={combinedRef}
        {...props}
      >
        <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-4">
          {/* Left side */}
          <div className="flex items-center gap-2">
            {/* Mobile menu trigger */}
            {isMobile && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    className="group hover:bg-accent hover:text-accent-foreground h-9 w-9"
                    size="icon"
                    variant="ghost"
                  >
                    <HamburgerIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-2">
                  <NavigationMenu className="max-w-none">
                    <NavigationMenuList className="flex-col items-start gap-1">
                      {navigationLinks.map((link, index) => (
                        <NavigationMenuItem className="w-full" key={index}>
                          <button
                            type="button"
                            className={cn(
                              'hover:bg-accent hover:text-accent-foreground flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium no-underline transition-colors',
                              link.active
                                ? 'bg-accent text-accent-foreground'
                                : 'text-foreground/80'
                            )}
                            onClick={(e) => e.preventDefault()}
                          >
                            {link.label}
                          </button>
                        </NavigationMenuItem>
                      ))}
                    </NavigationMenuList>
                  </NavigationMenu>
                </PopoverContent>
              </Popover>
            )}
            {/* Main nav */}
            <div className="flex items-center gap-6">
              <button
                type="button"
                className="text-primary hover:text-primary/90 flex cursor-pointer items-center space-x-2 transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                <div className="text-2xl">{logo}</div>
                <span className="hidden font-[nippo] text-3xl font-bold sm:inline-block">
                  benchmrk
                </span>
              </button>
              {/* Navigation menu */}
              {!isMobile && (
                <NavigationMenu className="flex">
                  <NavigationMenuList className="gap-1">
                    {navigationLinks.map((link, index) => (
                      <NavigationMenuItem key={index}>
                        <motion.button
                          type="button"
                          whileHover={{
                            scale: 1.05,
                            transition: {
                              duration: 0.2,
                              ease: EASE.expOut,
                            },
                          }}
                          whileTap={{ scale: 0.97 }}
                          className={cn(
                            'group hover:bg-accent hover:text-cyan-1 focus:bg-accent focus:text-accent-foreground text-md inline-flex h-9 w-max cursor-pointer items-center justify-center rounded-4xl px-4 py-2 font-semibold no-underline transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 xl:text-lg',
                            link.active
                              ? 'bg-accent text-accent-foreground'
                              : 'text-foreground/80 hover:text-foreground'
                          )}
                          onClick={(e) => e.preventDefault()}
                        >
                          {link.label}
                        </motion.button>
                      </NavigationMenuItem>
                    ))}
                  </NavigationMenuList>
                </NavigationMenu>
              )}
            </div>
          </div>
          {/* Right side */}
          <div className="flex items-center gap-3">
            <Button
              className="hover:bg-accent text-md hover:text-accent-foreground h-9 w-9 rounded-4xl p-2 font-semibold xl:text-lg"
              onClick={(e) => {
                e.preventDefault();
                window.open('https://x.com/fvnky_07', '_blank');
              }}
              size="sm"
              variant="ghost"
              aria-label="Follow us on X (Twitter)"
            >
              <Image
                src="/x.svg"
                alt="X (Twitter)"
                width={16}
                height={16}
                className="h-4 w-4"
              />
            </Button>
            {/* <Button */}
            {/*   className="hover:bg-accent text-md hover:text-accent-foreground h-9 rounded-4xl px-4 font-semibold xl:text-lg" */}
            {/*   onClick={(e) => { */}
            {/*     e.preventDefault(); */}
            {/*     if (onSignInClick) { */}
            {/*       onSignInClick(); */}
            {/*     } */}
            {/*   }} */}
            {/*   size="sm" */}
            {/*   variant="outline" */}
            {/* > */}
            {/*   {signInText} */}
            {/* </Button> */}
            <Button
              className="text-md h-9 rounded-4xl px-4 font-semibold shadow-sm xl:text-lg"
              onClick={(e) => {
                e.preventDefault();
                if (onCtaClick) {
                  onCtaClick();
                } else {
                  // NOTE: Default behavior - scroll to waitlist + focus input
                  const section = document.getElementById('waitlist');
                  section?.scrollIntoView({ behavior: 'smooth' });
                  setTimeout(() => {
                    document.getElementById('input-button-group')?.focus();
                  }, 500);
                }
              }}
              size="sm"
            >
              {ctaText}
              <ArrowRight />
            </Button>
          </div>
        </div>
      </header>
    );
  }
);

Navbar.displayName = 'Navbar';

export { Logo, HamburgerIcon };

// Demo
export function Demo() {
  return (
    <div className="fixed inset-0">
      <Navbar />
    </div>
  );
}
