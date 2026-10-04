'use client';

import { ArrowRight, ArrowUpRight, GitFork } from 'lucide-react';
import { domAnimation, LazyMotion, m } from 'motion/react';

import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { NavbarBadgeLink } from '@/components/ui/navbar-badge-link';
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
import { EASE } from '@/lib/animation-config';
import { cn } from '@/lib/utils';

// Default logo for the navbar: the benchmrk app icon (see app/icon.svg)
const Logo = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      aria-label="benchmrk"
      role="img"
      fill="none"
      height="1em"
      viewBox="0 0 1024 1024"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect width="1024" height="1024" rx="260" fill="#28E2A4" />
      <path
        d="M480 79.013C480 72.6104 487.147 68.8019 492.462 72.3726L668.462 190.623C670.673 192.109 672 194.598 672 197.263V512.5V827.719C672 830.393 670.663 832.891 668.438 834.375L492.438 951.708C487.121 955.253 480 951.441 480 945.052V79.013Z"
        fill="black"
      />
      <path
        d="M704 460.31C704 454.521 709.959 450.648 715.249 453L891.249 531.222C894.138 532.506 896 535.371 896 538.532V945.052C896 951.441 888.879 955.253 883.562 951.708L707.562 834.375C705.337 832.891 704 830.393 704 827.719V460.31Z"
        fill="black"
      />
      <rect x="320" y="128" width="128" height="768" rx="16" fill="black" />
      <rect x="160" y="256" width="128" height="512" rx="16" fill="black" />
      <rect x="124" y="448" width="221" height="128" rx="24" fill="black" />
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
interface NavbarNavLink {
  href: string;
  label: string;
  active?: boolean;
  badge?: {
    metadata: string; // Version number (e.g., "v0.1.0") or blog post title
    icon?: React.ReactNode; // Optional icon to display in badge
  };
}

/**
 * Custom style overrides for navbar elements
 * Allows granular control over colors and appearance
 */
export interface NavbarCustomStyles {
  // Container/background
  background?: string;
  backdropBlur?: boolean;

  // Logo & brand
  logoColor?: string;
  brandText?: string;

  // Navigation links
  navLinkBase?: string;
  navLinkHover?: string;
  navLinkActive?: string;
  navLinkInactive?: string;

  // Buttons
  ctaButton?: string;
  ctaButtonHover?: string;
  iconButton?: string;
  iconButtonBorder?: string; // Border color for icon buttons (e.g., Twitter button)
  iconButtonImage?: string; // Image source for icon button (e.g., '/x.svg' or '/x-light.svg')

  // Badges
  badgeBorder?: string; // Border color for badge links
  badgeTextColor?: string; // Text color for badge metadata and icons
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
  // NOTE: onCtaClick removed - use default scroll behavior or pass ctaHref
  backgroundColor?: string;

  // NEW: Variant system for predefined themes
  variant?: 'default' | 'light' | 'dark';

  // NEW: Custom style overrides (takes precedence over variant)
  customStyles?: NavbarCustomStyles;

  // NEW: Option to remove horizontal padding
  noPadding?: boolean;
}

// Default navigation links
const defaultNavigationLinks: NavbarNavLink[] = [
  {
    href: '/changelog',
    label: 'Changelog',
    badge: {
      metadata: 'v0.1.0',
      icon: <GitFork className="h-4 w-4" />,
    },
  },
  {
    href: '/blog',
    label: 'Blog',
    badge: {
      metadata: 'Getting Started',
      icon: <ArrowUpRight data-icon="inline-end" className="h-4 w-4" />,
    },
  },
  { href: '/about', label: 'About' },
];

// NOTE: Variant presets - predefined style combinations for common use cases
const variantPresets: Record<'default' | 'light' | 'dark', NavbarCustomStyles> =
  {
    // Default variant: Dark theme with green/cyan brand colors (hero page)
    default: {
      background: 'transparent',
      backdropBlur: true,
      logoColor: 'text-black',
      brandText: 'text-green-1',
      navLinkBase: 'text-green-1',
      navLinkHover: 'hover:text-cyan-1',
      navLinkActive: 'bg-accent text-accent-foreground',
      navLinkInactive: 'text-foreground/80 hover:text-foreground',
      ctaButton: 'bg-green-1 text-black',
      ctaButtonHover: 'hover:bg-green-1/90',
      iconButton: 'hover:bg-accent hover:text-accent-foreground',
      iconButtonImage: '/x.svg', // White X logo for dark background
      badgeTextColor: 'text-white', // White text on dark hero background
    },

    // Light variant: White background with black text (floating navbar)
    light: {
      background: 'bg-white',
      backdropBlur: false,
      logoColor: 'text-black',
      brandText: 'text-black',
      navLinkBase: 'text-black',
      navLinkHover: 'hover:text-gray-700',
      navLinkActive: 'bg-gray-100 text-black',
      navLinkInactive: 'text-black/80 hover:text-black',
      ctaButton: 'bg-green-1 text-black',
      ctaButtonHover: 'hover:bg-green-1/90',
      iconButton: 'hover:bg-gray-100 text-black',
      iconButtonImage: '/x-light.svg', // Black X logo for white background
      badgeTextColor: 'text-black', // Black text on white floating navbar
    },

    // Dark variant: Pure dark theme (future use)
    dark: {
      background: 'bg-black',
      backdropBlur: false,
      logoColor: 'text-white',
      brandText: 'text-white',
      navLinkBase: 'text-white',
      navLinkHover: 'hover:text-gray-300',
      navLinkActive: 'bg-white/10 text-white',
      navLinkInactive: 'text-white/80 hover:text-white',
      ctaButton: 'bg-white text-black',
      ctaButtonHover: 'hover:bg-white/90',
      iconButton: 'hover:bg-white/10 text-white',
      iconButtonImage: '/x.svg', // White X logo for dark background
      badgeTextColor: 'text-white', // White text on dark background
    },
  };

/**
 * Resolves final styles by merging variant preset with custom overrides
 * @param variant - Base variant preset to use
 * @param customStyles - Custom style overrides (takes precedence)
 * @returns Merged style configuration
 */
function resolveStyles(
  variant: 'default' | 'light' | 'dark',
  customStyles?: NavbarCustomStyles
): NavbarCustomStyles {
  const baseStyles = variantPresets[variant];
  return {
    ...baseStyles,
    ...customStyles,
  };
}

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
      backgroundColor = 'bg-black-2',
      variant = 'default',
      customStyles,
      noPadding = false,
      ...props
    },
    ref
  ) => {
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLElement>(null);

    // NOTE: Resolve final styles by merging variant preset with custom overrides
    const styles = resolveStyles(variant, customStyles);

    // NOTE: backgroundColor prop is deprecated, but kept for backward compatibility
    // If customStyles.background is not provided, fall back to backgroundColor prop
    const finalBackground = styles.background || backgroundColor;

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
      <LazyMotion features={domAnimation}>
        <header
          className={cn(
            'sticky top-0 z-50 w-full **:no-underline',
            !noPadding && 'px-4 md:px-6 xl:px-4',
            styles.backdropBlur !== false && 'backdrop-blur',
            finalBackground,
            className
          )}
          ref={combinedRef}
          {...props}
        >
          <div
            className={cn(
              'flex h-16 items-center justify-between gap-4',
              !noPadding ? 'container mx-auto max-w-screen-2xl' : 'w-full px-6'
            )}
          >
            {/* Left side */}
            <div className="flex items-center gap-2">
              {/* Mobile menu trigger */}
              {isMobile && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      className="group h-9 w-9 hover:bg-accent hover:text-accent-foreground"
                      size="icon"
                      variant="ghost"
                    >
                      <HamburgerIcon />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-48 p-2">
                    <NavigationMenu className="max-w-none">
                      <NavigationMenuList className="flex-col items-start gap-1">
                        {navigationLinks.map((link) => (
                          <NavigationMenuItem
                            className="w-full"
                            key={link.href}
                          >
                            {link.badge ? (
                              <NavbarBadgeLink
                                href={link.href}
                                label={link.label}
                                metadata={link.badge.metadata}
                                icon={link.badge.icon}
                                active={link.active}
                                className="w-full justify-start"
                                borderColor={styles.badgeBorder}
                                textColor={styles.badgeTextColor}
                              />
                            ) : (
                              <Link
                                href={link.href}
                                className={cn(
                                  'flex w-full cursor-pointer items-center rounded-md px-3 py-2 font-medium text-sm no-underline transition-colors hover:bg-accent hover:text-accent-foreground',
                                  link.active
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-foreground/80'
                                )}
                              >
                                {link.label}
                              </Link>
                            )}
                          </NavigationMenuItem>
                        ))}
                      </NavigationMenuList>
                    </NavigationMenu>
                  </PopoverContent>
                </Popover>
              )}
              {/* Main nav */}
              <div className="flex items-center gap-6">
                <Link
                  href="/"
                  className={cn(
                    'flex cursor-pointer items-center space-x-2 transition-colors hover:opacity-90',
                    styles.logoColor
                  )}
                >
                  <div className="text-2xl">{logo}</div>
                  <span
                    className={cn(
                      'hidden font-[nippo] font-bold text-3xl sm:inline-block',
                      styles.brandText
                    )}
                  >
                    benchmrk
                  </span>
                </Link>
                {/* Navigation menu */}
                {!isMobile && (
                  <NavigationMenu className="flex">
                    <NavigationMenuList className="gap-1">
                      {navigationLinks.map((link) => (
                        <NavigationMenuItem key={link.href}>
                          {link.badge ? (
                            <NavbarBadgeLink
                              href={link.href}
                              label={link.label}
                              metadata={link.badge.metadata}
                              icon={link.badge.icon}
                              active={link.active}
                              className={cn(
                                styles.navLinkBase,
                                styles.navLinkHover
                              )}
                              borderColor={styles.badgeBorder}
                              textColor={styles.badgeTextColor}
                            />
                          ) : (
                            <Link href={link.href}>
                              <m.div
                                whileHover={{
                                  scale: 1.05,
                                  transition: {
                                    duration: 0.2,
                                    ease: EASE.expOut,
                                  },
                                }}
                                whileTap={{ scale: 0.97 }}
                                className={cn(
                                  'group inline-flex h-9 w-max cursor-pointer items-center justify-center rounded-4xl px-4 py-2 font-semibold text-md no-underline transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 xl:text-lg',
                                  styles.navLinkBase,
                                  styles.navLinkHover,
                                  link.active
                                    ? styles.navLinkActive
                                    : styles.navLinkInactive
                                )}
                              >
                                {link.label}
                              </m.div>
                            </Link>
                          )}
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
                className={cn(
                  'h-9 w-9 rounded-xl bg-transparent p-2 font-semibold text-md xl:text-lg',
                  styles.iconButton,
                  styles.iconButtonBorder
                )}
                onClick={(e) => {
                  e.preventDefault();
                  window.open('https://github.com/fvnky07/benchmrk', '_blank');
                }}
                size="sm"
                variant="ghost"
                aria-label="View benchmrk on GitHub"
              >
                <Image
                  src={styles.iconButtonImage || '/x.svg'}
                  alt="GitHub"
                  width={16}
                  height={16}
                  className="h-12 w-12"
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
                className={cn(
                  'h-9 rounded-4xl px-4 font-semibold text-md shadow-sm xl:text-lg',
                  styles.ctaButton,
                  styles.ctaButtonHover
                )}
                onClick={(e) => {
                  e.preventDefault();
                  // NOTE: Default behavior - scroll to waitlist + focus input
                  // If on different page, navigate to home with hash
                  const section = document.querySelector('#waitlist');
                  if (section) {
                    section.scrollIntoView({ behavior: 'smooth' });
                    setTimeout(() => {
                      (
                        document.querySelector(
                          '#input-button-group'
                        ) as HTMLElement
                      )?.focus();
                    }, 500);
                  } else {
                    globalThis.location.href = '/#waitlist';
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
      </LazyMotion>
    );
  }
);

Navbar.displayName = 'Navbar';

// Demo
function _Demo() {
  return (
    <div className="fixed inset-0">
      <Navbar />
    </div>
  );
}
