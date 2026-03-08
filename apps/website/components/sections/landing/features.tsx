'use client';

import { BarChart3, Brain, Dumbbell, Target, Zap } from 'lucide-react';
import { FadeInView } from '@/components/animations/FadeInView';

export default function Features() {
  return (
    <section className="relative w-full px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="mb-12 flex flex-col items-center text-center">
          <FadeInView direction="up">
            <h2 className="font-[nippo] font-bold text-4xl text-white tracking-tight sm:text-6xl">
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
            <div className="group relative flex h-full flex-col overflow-hidden rounded-4xl border-4 border-white/5 bg-black-1 p-8 transition-all hover:border-cyan-1/50">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-1/10">
                <Brain className="h-10 w-10 text-cyan-1" />
              </div>
              <h3 className="mb-4 font-bold text-3xl text-white">
                AI-Powered Personal Trainer
              </h3>
              <p className="mb-8 text-lg text-white/60">
                Your AI coach analyzes every set to provide real-time feedback
                on volume, intensity, and progressive overload. It's like having
                a world-class trainer in your pocket, 24/7.
              </p>
              <div className="mt-auto aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black-2 p-4">
                {/* Placeholder for an app interface mockup or illustration */}
                <div className="flex h-full flex-col gap-2">
                  <div className="h-4 w-3/4 rounded bg-white/10" />
                  <div className="h-4 w-1/2 rounded bg-white/5" />
                  <div className="mt-4 flex grow items-end gap-2">
                    {[40, 70, 45, 90, 65, 80].map((h) => (
                      <div
                        key={h}
                        className="w-full rounded-t bg-cyan-1/40"
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
            <div className="group relative flex h-full items-center gap-8 overflow-hidden rounded-4xl border-4 border-white/5 bg-black-1 p-8 transition-all hover:border-green-1/50">
              <div className="flex-1">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-1/10">
                  <Zap className="h-8 w-8 text-green-1" />
                </div>
                <h3 className="mb-2 font-bold text-2xl text-white">
                  Lightning Fast Logging
                </h3>
                <p className="text-white/60">
                  Minimal input, maximum results. Log your entire workout in
                  under 60 seconds.
                </p>
              </div>
              <div className="hidden h-32 w-32 shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-black-2 sm:flex">
                <Dumbbell className="h-16 w-16 text-green-1 opacity-20" />
              </div>
            </div>
          </FadeInView>

          {/* Features 3 + 4: Analytics & Goals — share the right bottom col-span-3 */}
          <div className="grid grid-cols-2 gap-4 md:col-span-3 md:row-span-1">
            {/* Feature 3: Analytics */}
            <FadeInView delay={0.3} className="h-full">
              <div className="group relative flex h-full flex-col overflow-hidden rounded-4xl border-4 border-white/5 bg-black-1 p-6 transition-all hover:border-purple-1/50">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-1/10">
                  <BarChart3 className="h-6 w-6 text-purple-1" />
                </div>
                <h3 className="mb-2 font-bold text-white text-xl">
                  Visual Analytics
                </h3>
                <p className="text-sm text-white/60">
                  Visualize strength gains and volume trends.
                </p>
              </div>
            </FadeInView>

            {/* Feature 4: Goals */}
            <FadeInView delay={0.4} className="h-full">
              <div className="group relative flex h-full flex-col overflow-hidden rounded-4xl border-4 border-white/5 bg-black-1 p-6 transition-all hover:border-yellow-1/50">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-1/10">
                  <Target className="h-6 w-6 text-yellow-1" />
                </div>
                <h3 className="mb-2 font-bold text-white text-xl">
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
