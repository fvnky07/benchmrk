'use client';
import Squares from '@/components/Squares';
import { Iphone } from '@/components/ui/iphone';
import GridPattern from '@/components/ui/grid-pattern';
import { Brain, Zap, BarChart3, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useEffect } from 'react';
import { Navbar } from '@/components/ui/navbar';
import Image from 'next/image';
import LogoSvg from '@/public/logo.svg';

export default function Hero() {
  const heroItems = [1, 2, 3];

  // useEffect(() =>{
  //
  // },[timer])
  return (
    <section className="relative flex h-screen w-full shrink items-center justify-center overflow-hidden bg-white px-4 py-4 sm:px-4 lg:px-4">
      {/* Grid Pattern Background */}
      <GridPattern width={30} height={30} strokeColor="rgba(0, 0, 0, 1)" />

      {/* Centered card with responsive margins */}
      <div className="bg-black-1 relative z-10 flex h-full w-full flex-col overflow-hidden rounded-4xl p-2 shadow lg:p-4 xl:p-6">
        {/* NOTE: Navbar row - fixed height to prevent overflow */}
        <Navbar
          backgroundColor="bg-black-2"
          ctaText="Join the Waitlist!"
          logo={
            <Image
              src={LogoSvg}
              alt="logo"
              width={32}
              height={32}
              className="relative h-25 w-20 md:bottom-1.5 md:h-12 md:w-12"
            />
          }
        />

        {/* NOTE: Main content row - uses min-h-0 to allow flexbox shrinking */}
        <div className="bg-black-1 flex min-h-0 w-full grow flex-col gap-2 rounded-4xl lg:flex-row lg:gap-8">
          <div className="bg-black-2 debug flex min-h-0 w-full shrink flex-col items-start justify-start gap-4 overflow-y-auto rounded-4xl px-6 py-4 sm:gap-5 sm:px-8 sm:py-6 lg:w-2/3 lg:px-10 lg:py-8">
            <h1 className="w-full shrink-0 text-center text-3xl leading-tight font-bold sm:text-4xl lg:text-6xl 2xl:text-8xl">
              Tired of eye-balling your training?
            </h1>

            <Accordion
              type="single"
              defaultValue="1"
              className="bg-black-1 w-full shrink-0 rounded-4xl"
            >
              <AccordionItem value="1" className="px-2 md:px-4">
                <AccordionTrigger>
                  <Brain className="text-cyan-1 size-5 shrink-0 sm:size-6 lg:size-8" />
                  <span>AI-Powered Coaching</span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="lg:text-2xl 2xl:text-4xl">
                    Get personalized workout recommendations and form
                    corrections powered by advanced machine learning. Your AI
                    coach adapts to your fitness level and helps you reach your
                    goals faster.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="2" className="px-2 md:px-4">
                <AccordionTrigger>
                  <Zap className="text-cyan-1 size-5 shrink-0 sm:size-6 lg:size-7" />
                  <span>Better Than Paper Tracking</span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="lg:text-2xl 2xl:text-4xl">
                    Lightning-fast workout logging that&apos;s easier than pen
                    and paper. Track sets, reps, and weights in seconds with our
                    intuitive interface designed for the gym floor.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="3" className="px-2 md:px-4">
                <AccordionTrigger>
                  <BarChart3 className="text-cyan-1 size-5 shrink-0 sm:size-6 lg:size-7" />
                  <span>In-Depth Statistics</span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="lg:text-2xl 2xl:text-4xl">
                    Visualize your progress with detailed analytics and
                    performance metrics. See strength gains, volume trends, and
                    personal records at a glance to stay motivated.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="hidden w-full items-center justify-center sm:block">
              <Button
                size="lg"
                className="hover:text-green-1 hover:border-green-1 w-full shrink-0 rounded-4xl bg-white text-3xl font-bold text-black hover:border-4 hover:bg-white/90 sm:px-12 sm:py-8 sm:text-4xl lg:text-5xl"
              >
                Get Lifetime Premium
                <ArrowRight className="ml-2 size-8 sm:size-10 lg:size-12" />
              </Button>
            </div>
          </div>

          <div className="bg-black-2 relative flex min-h-48 w-full grow items-center justify-center overflow-hidden rounded-4xl shadow-[0_0_60px_rgba(52,211,153,0.5)] lg:min-h-0 lg:w-1/3">
            <div className="bg-green-1 absolute inset-0">
              <Squares
                speed={0.5}
                squareSize={60}
                direction="down"
                borderColor="#1F1F1F"
                hoverFillColor="#1F1F1F"
              />
            </div>
            {/* NOTE: pointer-events-none allows hover to pass through to Squares canvas */}
            <div className="debug-5 pointer-events-none relative z-10 flex h-full w-full items-center justify-center lg:p-4">
              <Iphone
                videoSrc="/hero-video-1.mp4"
                onVideoEnded={() => {
                  console.log('video has ended!');
                }}
                className="h-full w-auto max-w-full overflow-clip"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
