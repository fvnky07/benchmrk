// NOTE: Client component for welcome page with Motion animations
'use client';

import { SiGithub } from '@icons-pack/react-simple-icons';
import {
  CheckCircle2,
  Clock,
  Dumbbell,
  HeadphonesIcon,
  Rocket,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { domAnimation, LazyMotion, m } from 'motion/react';
import Link from 'next/link';

import { FadeInView } from '@/components/animations/FadeInView';
import {
  StaggerChildren,
  StaggerItem,
} from '@/components/animations/StaggerChildren';
import { Button } from '@/components/ui/button';
import { GridPattern } from '@/components/ui/grid-pattern';
import {
  bounceInVariants,
  EASE,
  fadeInVariants,
  scaleInVariants,
} from '@/lib/animation-config';
import { useSession } from '@/lib/auth-client';

export default function WelcomeContent() {
  // NOTE: Get session from Better Auth client
  const { data: session } = useSession();

  // NOTE: Premium benefits list
  const benefits = [
    {
      icon: Dumbbell,
      title: 'AI Workout Coach',
      description:
        'Personalized recommendations that adapt to your progress and goals',
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics',
      description:
        'Deep insights into your performance with beautiful visualizations',
    },
    {
      icon: Clock,
      title: 'Unlimited History',
      description: 'Access your complete workout history, forever',
    },
    {
      icon: HeadphonesIcon,
      title: 'Priority Support',
      description: 'Get help when you need it with dedicated premium support',
    },
    {
      icon: Rocket,
      title: 'All Future Features',
      description: 'Every new premium feature we release, automatically yours',
    },
  ];

  return (
    <LazyMotion features={domAnimation}>
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black-1 px-4 py-12">
        <GridPattern
          width={30}
          height={30}
          strokeColor="rgba(255,255,255, 0.1)"
        />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          {/* NOTE: Celebration badge fades in */}
          <m.div
            initial="hidden"
            animate="visible"
            variants={fadeInVariants}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="font-medium text-emerald-400 text-sm">
              Email confirmed successfully
            </span>
          </m.div>

          {/* NOTE: Trophy bounces in with rotation */}
          <m.div
            initial="hidden"
            animate="visible"
            variants={bounceInVariants}
            className="mb-6 flex justify-center"
          >
            <div className="relative">
              <Trophy className="h-20 w-20 text-cyan-1" />
              <Sparkles className="absolute -top-2 -right-2 h-8 w-8 animate-pulse text-yellow-400" />
            </div>
          </m.div>

          {/* NOTE: Heading and subtitle stagger in */}
          <StaggerChildren staggerDelay={0.15} initialDelay={0.4} onLoad>
            <StaggerItem>
              <h1 className="mb-4 font-[nippo] font-bold text-4xl text-white tracking-tight sm:text-5xl md:text-6xl">
                Welcome to{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  benchmrk
                </span>
                !
              </h1>
            </StaggerItem>

            <StaggerItem>
              <p className="mb-2 text-gray-300 text-xl sm:text-2xl">
                You&apos;re officially a{' '}
                <span className="font-semibold text-emerald-400">
                  Lifetime Premium
                </span>{' '}
                member
              </p>
            </StaggerItem>

            <StaggerItem>
              {session?.user && (
                <p className="mb-8 text-gray-500">
                  Registered as{' '}
                  <span className="text-gray-400">{session.user.email}</span>
                </p>
              )}
            </StaggerItem>
          </StaggerChildren>

          {/* NOTE: Benefits grid with staggered card entrance */}
          <FadeInView delay={0.6}>
            <div className="mb-10 rounded-3xl border border-gray-800 bg-gray-900/50 p-6">
              <h2 className="mb-6 font-semibold text-cyan-1 text-lg">
                What you get - forever
              </h2>

              <StaggerChildren
                staggerDelay={0.08}
                initialDelay={0.2}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {benefits.map((benefit) => (
                  <StaggerItem key={benefit.title} variants={scaleInVariants}>
                    <div className="rounded-2xl border border-gray-800 bg-gray-800/50 p-4 text-left transition-all hover:border-cyan-500/30 hover:bg-gray-800">
                      <benefit.icon className="mb-3 h-6 w-6 text-cyan-1" />
                      <h3 className="mb-1 font-medium text-white">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {benefit.description}
                      </p>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerChildren>
            </div>
          </FadeInView>

          {/* NOTE: Launch announcement fades/scales in */}
          <FadeInView variants={scaleInVariants} delay={0.8}>
            <div className="mb-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
              <Rocket className="mx-auto mb-3 h-8 w-8 text-yellow-400" />
              <h3 className="mb-2 font-semibold text-lg text-yellow-400">
                App Launching Soon
              </h3>
              <p className="text-gray-400">
                We&apos;re putting the finishing touches on benchmrk.
                You&apos;ll be the first to know when it&apos;s ready!
              </p>
            </div>
          </FadeInView>

          {/* NOTE: CTA buttons stagger in */}
          <StaggerChildren
            staggerDelay={0.12}
            initialDelay={1}
            onLoad
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <StaggerItem>
              <Button
                asChild
                className="rounded-full bg-cyan-1 px-6 py-3 font-semibold text-black hover:bg-cyan-1/90"
              >
                <Link
                  href="https://github.com/fvnky07/benchmrk"
                  target="_blank"
                >
                  <SiGithub className="mr-2 h-4 w-4" />
                  Star on GitHub
                </Link>
              </Button>
            </StaggerItem>

            <StaggerItem>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-gray-700 px-6 py-3 text-gray-300 hover:bg-gray-800"
              >
                <Link href="/">Back to home</Link>
              </Button>
            </StaggerItem>
          </StaggerChildren>
        </div>

        {/* NOTE: Decorative dots with randomized Motion entrance */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[
            {
              top: '25%',
              left: '25%',
              color: 'bg-cyan-1/20',
              delay: 0.2,
            },
            {
              top: '33%',
              right: '33%',
              color: 'bg-emerald-500/20',
              delay: 0.7,
            },
            {
              bottom: '33%',
              left: '33%',
              color: 'bg-yellow-500/20',
              delay: 1.2,
            },
            {
              right: '25%',
              bottom: '25%',
              color: 'bg-cyan-1/20',
              delay: 1.7,
            },
          ].map((dot) => (
            <m.div
              key={dot.delay}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: 1,
                scale: [1, 1.5, 1],
              }}
              transition={{
                delay: dot.delay,
                duration: 2,
                ease: EASE.gentle,
                scale: {
                  repeat: Infinity,
                  duration: 3,
                  ease: EASE.expInOut,
                },
              }}
              className={`absolute h-2 w-2 rounded-full ${dot.color}`}
              style={{
                top: dot.top,
                left: dot.left,
                right: dot.right,
                bottom: dot.bottom,
              }}
            />
          ))}
        </div>
      </main>
    </LazyMotion>
  );
}
