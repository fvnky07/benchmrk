'use client';

import { SiGithub, SiX } from '@icons-pack/react-simple-icons';
import { ArrowUpRight, Clock, GitFork } from 'lucide-react';
import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { FloatingNavbar } from '@/components/ui/floating-navbar';
import { Separator } from '@/components/ui/separator';
import LogoSvg from '@/public/logo-dark.svg';

export function AboutContent() {
  return (
    <>
      <FloatingNavbar
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
          { href: '/about', label: 'About', active: true },
          { href: '/pricing', label: 'Pricing' },
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
      <main className="flex min-h-screen w-full items-center justify-center bg-black-2 px-4 py-24 sm:px-8">
        <div className="flex w-full max-w-7xl flex-col gap-8 lg:flex-row">
          {/* Left Card: Personal Profile */}
          <div className="flex flex-1 flex-col items-start justify-between gap-6 rounded-4xl border-2 border-white/10 bg-black-1 p-8">
            <div className="flex w-full flex-col gap-4">
              {/* Profile Image Placeholder */}
              <div className="relative aspect-square w-full overflow-hidden rounded-4xl bg-green-1">
                <div className="flex h-full w-full items-center justify-center font-bold text-8xl text-black">
                  FV
                </div>
              </div>

              {/* Name */}
              <h1 className="font-bold text-5xl text-white sm:text-6xl">
                benchmrk team
              </h1>

              {/* Role Badges */}
              <div className="flex flex-row flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  Founder
                </Badge>
                <Separator orientation="vertical" className="h-4" />
                <Badge variant="outline" className="text-sm">
                  Lead Dev
                </Badge>
              </div>

              <Separator className="my-2" />

              {/* Bio */}
              <p className="text-base text-white/70 leading-relaxed sm:text-lg">
                Passionate software engineer focused on building performant,
                user-centric applications. Dedicated to creating tools that
                empower developers and simplify complex workflows through
                elegant design and robust architecture.
              </p>
            </div>

            {/* Social Links Button Group */}
            <ButtonGroup className="w-full">
              <Button
                variant="outline"
                size="icon"
                className="flex-1"
                onClick={() => window.open('https://github.com', '_blank')}
              >
                <SiGithub className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="flex-1"
                onClick={() => window.open('https://twitter.com', '_blank')}
              >
                <SiX className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="flex-1"
                onClick={() => window.open('https://linkedin.com', '_blank')}
              >
                <Clock className="h-5 w-5" />
              </Button>
            </ButtonGroup>
          </div>

          {/* Right Card: Benchmrk Story */}
          <div className="flex flex-2 flex-col gap-6 rounded-4xl p-8">
            <h1 className="font-bold text-4xl text-white sm:text-5xl lg:text-6xl">
              Why Benchmrk Started
            </h1>
            <div className="space-y-6 text-lg text-white leading-relaxed sm:text-2xl">
              <p>
                Benchmrk was born from a recurring frustration: existing
                performance measurement tools were either overly complex, lacked
                intuitive visualizations, or failed to integrate seamlessly into
                modern development workflows. Developers needed a better way to
                understand how their code performed in real-world scenarios.
              </p>
              <p>
                We envisioned a platform that makes benchmarking accessible to
                everyone—from solo developers shipping side projects to
                enterprise teams optimizing critical infrastructure. By
                combining powerful analytics with an intuitive interface,
                Benchmrk helps teams identify bottlenecks, track improvements,
                and build faster software with confidence.
              </p>
              <p>
                Our mission is simple: make performance transparent, actionable,
                and collaborative. We believe that when developers have the
                right insights at their fingertips, they can make smarter
                decisions and deliver exceptional experiences to their users.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
