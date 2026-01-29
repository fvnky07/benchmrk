'use client';
import Squares from '@/components/Squares';
import { Iphone } from '@/components/ui/iphone';
import GridPattern from '@/components/ui/grid-pattern';
import { Brain, Zap, BarChart3 } from 'lucide-react';
import { Accordion, AccordionTrigger } from '@radix-ui/react-accordion';
import { AccordionContent, AccordionItem } from '@/components/ui/accordion';

export default function Hero() {
  return (
    <section className="debug-5 relative flex h-screen w-full items-center justify-center overflow-hidden bg-white px-4 py-4 sm:px-6 lg:px-4">
      {/* Grid Pattern Background */}
      <GridPattern width={30} height={30} strokeColor="rgba(0, 0, 0, 1)" />

      {/* Centered card with responsive margins */}
      <div className="bg-black-1 relative z-10 flex h-full w-full overflow-hidden rounded-4xl p-4 md:p-6 lg:p-6">
        {/* Two-column flex container */}
        <div className="debug-2 bg-black-1 flex h-full w-full flex-col gap-6 rounded-4xl lg:flex-row lg:gap-8">
          <div className="debug-5 flex w-full flex-col items-start justify-start gap-4 px-4 lg:w-2/3">
            <h1 className="debug-4 text-4xl leading-20 font-bold lg:text-7xl">
              Tired of Guessing if your Training Works??
            </h1>

            <Accordion
              type="single"
              collapsible
              defaultValue="1"
              className="debug w-full p-2 text-4xl"
            >
              <AccordionItem value="1" className="">
                <AccordionTrigger className="flex flex-row items-center justify-center hover:underline">
                  <Brain className="text-cyan-1 size-12 pr-2" />
                  Easily Import all your fitness data in less than 1 min
                </AccordionTrigger>
                <AccordionContent className="text-2xl">
                  We offer standard (5-7 days), express (2-3 days), and
                  overnight shipping. Free shipping on international orders.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="2" className="">
                <AccordionTrigger className="flex flex-row items-center justify-center hover:underline">
                  <Zap fill="true" className="text-cyan-1 size-12 pr-2" />
                  Better-than-paper tracking and extremely fast
                </AccordionTrigger>
                <AccordionContent className="text-xl">
                  We offer standard (5-7 days), express (2-3 days), and
                  overnight shipping. Free shipping on international orders.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="3" className="">
                <AccordionTrigger className="flex flex-row items-center justify-center hover:underline">
                  <BarChart3 fill="true" className="text-cyan-1 size-12 pr-2" />
                  Stay motivated with in-depth progression statistics
                </AccordionTrigger>
                <AccordionContent className="text-xl">
                  We offer standard (5-7 days), express (2-3 days), and
                  overnight shipping. Free shipping on international orders.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
