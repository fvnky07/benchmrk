'use client';

import { api } from '@repo/backend/convex/_generated/api';
import { useQuery } from 'convex/react';
import { ArrowRight } from 'lucide-react';
import { domAnimation, LazyMotion, m } from 'motion/react';
import Image from 'next/image';

import Squares from '@/components/Squares';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { LineShadowText } from '@/components/ui/line-shadow-text';
import { Navbar } from '@/components/ui/navbar';
import {
  DURATION,
  EASE,
  fadeInVariants,
  heroTitleContainerVariants,
  heroTitleWordVariants,
  slideUpVariants,
  typewriterCharVariants,
  typewriterContainerVariants,
} from '@/lib/animation-config';
import LogoSvg from '@/public/logo-light.svg';

const DESCRIPTION =
  'The ultimate AI-driven fitness companion that analyzes your data to build the perfect workout, every time. No more plateaus, just pure results.';

// Pre-split into stable objects so we avoid array-index keys in JSX
const DESCRIPTION_CHARS = DESCRIPTION.split('').map((char, i) => ({
  id: `c${i}`,
  char,
}));

export default function Hero() {
  const waitlistCount = useQuery(api.waitlist.getWaitlistCount) ?? 0;
  const MULTIPLIER = 300;
  const exaggeratedCount = (waitlistCount + 1) * MULTIPLIER;

  return (
    <LazyMotion features={domAnimation}>
      <section className="relative flex h-screen w-full shrink items-center justify-center overflow-hidden bg-white px-4 py-4 sm:py-6 lg:px-6">
        {/* Dynamic Squares Background */}
        <div className="absolute inset-0 z-0">
          <Squares
            direction="down"
            speed={0.5}
            squareSize={30}
            borderColor="rgba(0, 0, 0, 1)"
            hoverFillColor="rgba(0, 0, 0, 0.02)"
          />
        </div>

        {/* Main Hero Container */}
        <div className="relative z-10 flex h-full w-full max-w-400 flex-col rounded-4xl bg-black-1 p-2 shadow-2xl lg:p-4 xl:p-6">
          {/* Navbar */}
          <m.div
            initial="hidden"
            animate="visible"
            variants={fadeInVariants}
            className="shrink-0"
          >
            <Navbar
              variant="default"
              customStyles={{
                ctaButton: 'bg-white text-black',
                ctaButtonHover: 'hover:bg-gray-100',
              }}
              ctaText="Join the Waitlist!"
              logo={
                <Image
                  src={LogoSvg}
                  width={32}
                  alt="logo"
                  height={32}
                  className="relative sm:bottom-1 sm:h-12 sm:w-12"
                />
              }
            />
          </m.div>

          <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-8">
            {/* Left Content Column */}
            <div className="flex grow flex-col justify-between rounded-4xl border-2 bg-black-2 px-6 py-8 text-center sm:px-12 lg:items-start lg:px-8 lg:py-12 lg:text-left">
              <div className="flex flex-col items-center gap-6 lg:items-start">
                {/* High-Impact Title — word-by-word stagger */}
                <m.div
                  initial="hidden"
                  animate="visible"
                  variants={heroTitleContainerVariants}
                  className="max-w-4xl"
                >
                  <h1 className="font-bold text-4xl text-white tracking-tight sm:text-6xl lg:text-8xl 2xl:text-8xl">
                    {/* Line 1 */}
                    <span className="inline-flex flex-wrap items-baseline gap-x-3">
                      <m.span
                        variants={heroTitleWordVariants}
                        className="inline-block"
                      >
                        Stop
                      </m.span>
                      <m.span
                        variants={heroTitleWordVariants}
                        className="inline-block text-white/50"
                      >
                        Guessing.
                      </m.span>
                    </span>
                    <br />
                    {/* Line 2 */}
                    <span className="mt-2 inline-flex flex-row items-center justify-center gap-x-3 lg:justify-start">
                      <m.span
                        variants={heroTitleWordVariants}
                        className="inline-block"
                      >
                        Start
                      </m.span>
                      <m.span
                        variants={heroTitleWordVariants}
                        className="inline-block"
                      >
                        <LineShadowText
                          className="text-green-1 italic drop-shadow-[0_0_15px_rgba(0,255,144,0.3)]"
                          shadowColor="#00ff90"
                        >
                          Progressing
                        </LineShadowText>
                      </m.span>
                    </span>
                  </h1>
                </m.div>

                {/* Subheadline — typewriter character reveal */}
                <m.p
                  initial="hidden"
                  animate="visible"
                  variants={typewriterContainerVariants}
                  className="hidden max-w-xl text-base text-white/50 sm:block sm:text-xl lg:text-2xl"
                  aria-label={DESCRIPTION}
                >
                  {DESCRIPTION_CHARS.map(({ id, char }) => (
                    <m.span
                      key={id}
                      variants={typewriterCharVariants}
                      style={char === ' ' ? { whiteSpace: 'pre' } : undefined}
                    >
                      {char}
                    </m.span>
                  ))}
                </m.p>
              </div>

              {/* Action Buttons & Stats Row */}
              <div className="flex w-full flex-col justify-start gap-12">
                <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                  {/* CTA Button */}
                  <m.div
                    initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{
                      delay: 0.85,
                      duration: DURATION.slow,
                      ease: EASE.expOut,
                    }}
                    className="hidden sm:block"
                  >
                    <Button
                      size="lg"
                      className="group h-14 w-full rounded-2xl bg-white font-bold text-4xl text-black transition-all hover:scale-[1.02] hover:bg-green-1 hover:text-black active:scale-95 sm:h-20 sm:rounded-xl sm:px-24 sm:text-2xl lg:mx-0 lg:w-fit"
                      onClick={() => {
                        const section = document.querySelector('#waitlist');
                        section?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Join the Waitlist
                      <ArrowRight className="ml-2 size-6 transition-transform group-hover:translate-x-2 sm:ml-3 sm:size-8" />
                    </Button>
                  </m.div>

                  {/* Stats */}
                  <m.div
                    initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{
                      delay: 1.05,
                      duration: DURATION.slow,
                      ease: EASE.expOut,
                    }}
                    className="hidden flex-1 items-center rounded-2xl border-2 sm:flex sm:h-20"
                  >
                    <m.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: 1.15,
                        duration: DURATION.normal,
                        ease: EASE.expOut,
                      }}
                      className="flex flex-1 flex-col items-center justify-center"
                    >
                      <span className="font-[nippo] font-bold text-2xl text-white sm:text-5xl lg:text-6xl">
                        {exaggeratedCount.toLocaleString()}
                      </span>
                      <span className="font-medium text-[10px] text-white/40 uppercase tracking-widest sm:text-sm">
                        Waiting
                      </span>
                    </m.div>

                    <div className="h-12 w-px shrink-0 bg-white/20 sm:h-12" />

                    <m.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: 1.25,
                        duration: DURATION.normal,
                        ease: EASE.expOut,
                      }}
                      className="flex flex-1 flex-col items-center justify-center"
                    >
                      <span className="font-[nippo] font-bold text-2xl text-white sm:text-5xl lg:text-6xl">
                        126
                      </span>
                      <span className="font-medium text-[10px] text-white/40 uppercase tracking-widest sm:text-sm">
                        Total Users
                      </span>
                    </m.div>
                  </m.div>
                </div>

                {/* Social Proof - Hidden on small mobile to save space */}
                <m.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 1.4,
                    duration: DURATION.slow,
                    ease: EASE.expOut,
                  }}
                  className="hidden flex-col items-center gap-4 sm:flex lg:items-start"
                >
                  <p className="font-bold text-[10px] text-white/30 uppercase tracking-[0.2em] sm:text-xs">
                    Backed by the best in performance
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-4 opacity-20 grayscale transition-all hover:opacity-50 hover:grayscale-0 sm:gap-8 lg:justify-start">
                    <div className="font-black text-lg text-white italic tracking-tighter sm:text-xl">
                      FORCE.FIT
                    </div>
                    <div className="font-black text-lg text-white italic tracking-tighter sm:text-xl">
                      RECOVER
                    </div>
                    <div className="font-black text-lg text-white italic tracking-tighter sm:text-xl">
                      VELOCITY
                    </div>
                    <div className="font-black text-lg text-white italic tracking-tighter sm:text-xl">
                      TITAN
                    </div>
                  </div>
                </m.div>
              </div>
            </div>

            {/* Right Visual Column */}
            <m.div
              initial="hidden"
              animate="visible"
              variants={slideUpVariants}
              transition={{
                delay: 0.3,
                duration: DURATION.slow,
                ease: EASE.expOut,
              }}
              className="relative flex overflow-hidden rounded-4xl bg-black-2 lg:aspect-[9/16] lg:shrink-0"
            >
              <div className="relative z-10 h-full w-full">
                <AspectRatio
                  ratio={9 / 16}
                  className="h-full w-full overflow-hidden bg-black"
                >
                  <video
                    src="/hero-video-1.mp4"
                    className="h-full w-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                </AspectRatio>
              </div>
            </m.div>
          </div>
        </div>
      </section>
    </LazyMotion>
  );
}
