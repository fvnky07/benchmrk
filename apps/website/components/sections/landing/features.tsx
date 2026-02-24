'use client';

import { Brain, Zap, BarChart3, Target, Dumbbell } from 'lucide-react';
import { FadeInView } from '@/components/animations/FadeInView';

export default function Features() {
  return (
    <section className="relative w-full px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="mb-12 flex flex-col items-center text-center">
          <FadeInView direction="up">
            <h2 className="font-[nippo] text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Elevate Your Training
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-white/60 sm:text-xl">
              Powerful AI-driven tools designed to help you break through
              plateaus and track progress like never before.
            </p>
          </FadeInView>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6 md:grid-rows-2">
          {/* Feature 1: AI Coach (Large Bento) */}
          <FadeInView className="md:col-span-3 md:row-span-2" delay={0.1}>
            <div className="group bg-black-1 hover:border-cyan-1/50 relative flex h-full flex-col overflow-hidden rounded-4xl border-4 border-white/5 p-8 transition-all">
              <div className="bg-cyan-1/10 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
                <Brain className="text-cyan-1 h-10 w-10" />
              </div>
              <h3 className="mb-4 text-3xl font-bold text-white">
                AI-Powered Personal Trainer
              </h3>
              <p className="mb-8 text-lg text-white/60">
                Your AI coach analyzes every set to provide real-time feedback
                on volume, intensity, and progressive overload. It's like having
                a world-class trainer in your pocket, 24/7.
              </p>
              <div className="bg-black-2 mt-auto aspect-video w-full overflow-hidden rounded-2xl border border-white/10 p-4">
                {/* Placeholder for an app interface mockup or illustration */}
                <div className="flex h-full flex-col gap-2">
                  <div className="h-4 w-3/4 rounded bg-white/10" />
                  <div className="h-4 w-1/2 rounded bg-white/5" />
                  <div className="mt-4 flex grow items-end gap-2">
                    {[40, 70, 45, 90, 65, 80].map((h) => (
                      <div
                        key={h}
                        className="bg-cyan-1/40 w-full rounded-t"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeInView>

          {/* Feature 2: Logging (Medium Bento) */}
          <FadeInView className="md:col-span-3 md:row-span-1" delay={0.2}>
            <div className="group bg-black-1 hover:border-green-1/50 relative flex h-full items-center gap-8 overflow-hidden rounded-4xl border-4 border-white/5 p-8 transition-all">
              <div className="flex-1">
                <div className="bg-green-1/10 mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
                  <Zap className="text-green-1 h-8 w-8" />
                </div>
                <h3 className="mb-2 text-2xl font-bold text-white">
                  Lightning Fast Logging
                </h3>
                <p className="text-white/60">
                  Minimal input, maximum results. Log your entire workout in
                  under 60 seconds.
                </p>
              </div>
              <div className="bg-black-2 hidden h-32 w-32 shrink-0 items-center justify-center rounded-3xl border border-white/10 sm:flex">
                <Dumbbell className="text-green-1 h-16 w-16 opacity-20" />
              </div>
            </div>
          </FadeInView>

          {/* Features 3 + 4: Analytics & Goals — share the right bottom col-span-3 */}
          <div className="grid grid-cols-2 gap-4 md:col-span-3 md:row-span-1">
            {/* Feature 3: Analytics */}
            <FadeInView delay={0.3} className="h-full">
              <div className="group bg-black-1 hover:border-purple-1/50 relative flex h-full flex-col overflow-hidden rounded-4xl border-4 border-white/5 p-6 transition-all">
                <div className="bg-purple-1/10 mb-4 flex h-10 w-10 items-center justify-center rounded-lg">
                  <BarChart3 className="text-purple-1 h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">
                  Visual Analytics
                </h3>
                <p className="text-sm text-white/60">
                  Visualize strength gains and volume trends.
                </p>
              </div>
            </FadeInView>

            {/* Feature 4: Goals */}
            <FadeInView delay={0.4} className="h-full">
              <div className="group bg-black-1 hover:border-yellow-1/50 relative flex h-full flex-col overflow-hidden rounded-4xl border-4 border-white/5 p-6 transition-all">
                <div className="bg-yellow-1/10 mb-4 flex h-10 w-10 items-center justify-center rounded-lg">
                  <Target className="text-yellow-1 h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">
                  Goal Tracking
                </h3>
                <p className="text-sm text-white/60">
                  Set and smash PRs with intelligent goal setting.
                </p>
              </div>
            </FadeInView>
          </div>
        </div>
      </div>
    </section>
  );
}
