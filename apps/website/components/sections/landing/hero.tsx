'use client';
import Squares from '@/components/Squares';
import { Iphone } from '@/components/ui/iphone';
import GridPattern from '@/components/ui/grid-pattern';
import { Brain, Zap, BarChart3 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function Hero() {
  return (
    <section className="debug-5 relative flex h-screen w-full shrink items-center justify-center overflow-hidden bg-white px-4 py-4 sm:px-6 lg:px-4">
      {/* Grid Pattern Background */}
      <GridPattern width={30} height={30} strokeColor="rgba(0, 0, 0, 1)" />

      {/* Centered card with responsive margins */}
      <div className="bg-black-1 debug-2 relative z-10 flex h-full w-full flex-col overflow-hidden rounded-4xl p-2 shadow md:p-6 lg:p-4">
        <div className="debug-3 flex w-full flex-row">navbar</div>

        {/* Two-column flex container */}
        <div className="bg-black-1 debug-5 flex h-full w-full flex-col gap-2 rounded-4xl lg:flex-row lg:gap-8">
          <div className="bg-black-2 debug flex w-full shrink flex-col items-start justify-start gap-4 rounded-4xl px-6 py-4 sm:gap-5 sm:px-8 sm:py-6 lg:w-2/3 lg:px-10 lg:py-8">
            <h1 className="w-full text-center text-3xl leading-tight font-bold sm:text-4xl lg:text-6xl">
              Tired of eye-balling your training?
            </h1>

            <Accordion
              type="single"
              collapsible
              defaultValue="1"
              className="bg-black-1 hidden w-full rounded-4xl border sm:block"
            >
              <AccordionItem value="1" className="lg:px-4">
                <AccordionTrigger>
                  <Brain className="text-cyan-1 size-5 shrink-0 sm:size-6 lg:size-8" />
                  <span>AI-Powered Coaching</span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="lg:text-2xl">
                    Get personalized workout recommendations and form
                    corrections powered by advanced machine learning. Your AI
                    coach adapts to your fitness level and helps you reach your
                    goals faster.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="2" className="lg:px-4">
                <AccordionTrigger>
                  <Zap className="text-cyan-1 size-5 shrink-0 sm:size-6 lg:size-7" />
                  <span>Better Than Paper Tracking</span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="lg:text-2xl">
                    Lightning-fast workout logging that&apos;s easier than pen
                    and paper. Track sets, reps, and weights in seconds with our
                    intuitive interface designed for the gym floor.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="3" className="lg:px-4">
                <AccordionTrigger>
                  <BarChart3 className="text-cyan-1 size-5 shrink-0 sm:size-6 lg:size-7" />
                  <span>In-Depth Statistics</span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="lg:text-2xl">
                    Visualize your progress with detailed analytics and
                    performance metrics. See strength gains, volume trends, and
                    personal records at a glance to stay motivated.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <div className="debug flex h-full w-full grow flex-row items-center gap-1 lg:gap-4">
              <div className="debug-2 h-1/2 w-full rounded-4xl"></div>
              <div className="debug-2 h-1/2 w-full rounded-4xl"></div>
              <div className="debug-2 h-1/2 w-full rounded-4xl"></div>
            </div>
          </div>

          <div className="bg-black-2 relative flex w-full items-center justify-center overflow-hidden rounded-4xl shadow-[0_0_60px_rgba(52,211,153,0.5)] lg:w-1/3">
            <div className="bg-green-1 absolute inset-0">
              <Squares
                speed={0.5}
                squareSize={60}
                direction="down"
                borderColor="#1F1F1F"
                hoverFillColor="#1F1F1F"
              />
            </div>
            <div className="relative z-10 flex h-full w-full items-center justify-center lg:p-4">
              <Iphone className="h-full w-auto max-w-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
