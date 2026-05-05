// NOTE: Changelog page using fumadocs-mdx for MDX content management

import { ArrowUpRight, GitFork } from 'lucide-react';
import type { Metadata } from 'next';

import Image from 'next/image';
import type { ComponentType } from 'react';
import { docs } from '@/.source';
import type { MDXComponents } from '@/components/mdx-components';
import { getMDXComponents } from '@/components/mdx-components';
import { GridPattern } from '@/components/ui/grid-pattern';
import { Navbar } from '@/components/ui/navbar';
import { formatDate } from '@/lib/utils';
import LogoSvg from '@/public/logo-dark.svg';

export const metadata: Metadata = {
  title: 'Changelog',
  description:
    'Stay up to date with the latest benchmrk updates, features, and improvements.',
};

interface ChangelogDoc {
  date: string;
  title: string;
  version?: string;
  tags?: string[];
  body: ComponentType<{ components?: MDXComponents }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isChangelogDoc(value: unknown): value is ChangelogDoc {
  if (!isRecord(value)) return false;

  if (typeof value.date !== 'string') return false;
  if (typeof value.title !== 'string') return false;
  if (typeof value.body !== 'function') return false;

  if (value.version !== undefined && typeof value.version !== 'string') {
    return false;
  }

  if (
    value.tags !== undefined &&
    (!Array.isArray(value.tags) ||
      !value.tags.every((t) => typeof t === 'string'))
  ) {
    return false;
  }

  return true;
}

export default function HomePage() {
  const allPages: unknown[] = Array.isArray(docs) ? (docs as unknown[]) : [];

  const sortedChangelogs = allPages
    .filter(isChangelogDoc)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="relative min-h-screen overflow-hidden bg-black-2">
      {/* Background Grid Pattern */}
      <GridPattern
        width={60}
        height={60}
        className="absolute inset-0 h-full w-full"
        strokeColor="rgba(255, 255, 255, 0.03)"
      />

      <Navbar
        variant="light"
        navigationLinks={[
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
          { href: '/pricing', label: 'Pricing', active: true },
        ]}
        customStyles={{
          ctaButton: 'bg-green-1 text-black',
          ctaButtonHover: 'hover:bg-green-1/90',
        }}
        ctaText="Get Started"
        logo={
          <Image
            src={LogoSvg}
            alt="logo"
            width={32}
            height={32}
            className="relative bottom-0.5 h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12"
          />
        }
      />

      {/* Timeline */}
      <div className="relative mx-auto mt-8 mb-24 max-w-5xl rounded-4xl bg-black-1 px-6 pt-10 sm:outline-2 lg:px-10">
        <div className="relative">
          {sortedChangelogs.map((changelog) => {
            const MDX = changelog.body;
            const date = new Date(changelog.date);
            const formattedDate = formatDate(date);
            const version = changelog.version;
            const tags = changelog.tags;

            return (
              <div key={changelog.title} className="relative">
                <div className="flex flex-col gap-y-6 md:flex-row">
                  <div className="shrink-0 md:w-48">
                    <div className="pb-10 md:sticky md:top-24">
                      <time className="mb-3 block font-bold text-green-1 text-md">
                        {formattedDate}
                      </time>

                      {version && (
                        <div className="relative z-10 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 font-bold text-foreground text-md outline-2 outline-green-1">
                          <span>
                            <GitFork className="size-4" />
                          </span>
                          {version}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side - Content */}
                  <div className="relative flex-1 pb-10 md:pl-8">
                    {/* Vertical timeline line */}
                    <div className="absolute top-2 left-0 hidden h-full w-px bg-border md:block">
                      {/* Timeline dot */}
                      <div className="absolute z-10 hidden size-3 -translate-x-1/2 rounded-full bg-green-1 md:block" />
                    </div>

                    <div className="space-y-6">
                      <div className="relative z-10 flex flex-col gap-2">
                        <h2 className="text-balance font-semibold text-3xl tracking-tight">
                          {changelog.title}
                        </h2>

                        {tags && tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {/* Tags */}
                            {tags.map((tag) => (
                              <span
                                key={tag}
                                className="flex h-6 w-fit items-center justify-center rounded-full border bg-muted px-2 font-medium text-muted-foreground text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="prose dark:prose-invert max-w-none prose-headings:scroll-mt-8 prose-headings:text-balance prose-p:text-balance prose-headings:font-semibold prose-headings:tracking-tight prose-p:tracking-tight prose-a:no-underline">
                        <MDX components={getMDXComponents()} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
