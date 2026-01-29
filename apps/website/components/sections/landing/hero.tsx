'use client';
import Squares from '@/components/Squares';
import { Iphone } from '@/components/ui/iphone';
import { Button } from '@/components/ui/button';
import GridPattern from '@/components/ui/grid-pattern';

export default function Hero() {
  return (
    <section className="debug-5 relative flex h-screen w-full items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      {/* Grid Pattern Background */}
      <GridPattern
        className="fill-black-2/5 stroke-black-2/10"
        width={40}
        height={40}
      />

      {/* Centered card with responsive margins */}
      <div className="bg-black-1 relative z-10 flex h-full w-full overflow-hidden rounded-4xl p-4 md:p-8 lg:p-10">
        {/* Two-column flex container */}
        <div className="debug-2 bg-black-1 flex h-full w-full flex-col gap-6 rounded-4xl lg:flex-row lg:gap-8">
          <div className="debug-5 flex w-full flex-col items-center justify-start gap-8 px-4 lg:w-2/3">
            <h1 className="debug-4 text-4xl leading-tight font-bold lg:text-6xl">
              Tired of Guessing if your Training is Working?
            </h1>

            <p className="text-muted-foreground text-lg leading-relaxed lg:text-xl">
              Track your progress with precision. Get real-time insights into
              your workouts, measure your gains, and achieve your fitness goals
              faster with data-driven training.
            </p>

            <div className="flex items-start">
              <Button size="lg" className="text-base">
                Join the Waiting List
              </Button>
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
            <div className="relative z-10 flex h-full w-full items-center justify-center p-4">
              <Iphone className="h-full w-auto max-w-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
