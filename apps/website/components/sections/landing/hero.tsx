'use client';
import GlassSurface from '@/components/GlassSurface';
import Squares from '@/components/Squares';
import { Iphone } from '@/components/ui/iphone';

export default function Hero() {
  return (
    <section className="debug-5 relative flex h-screen w-full items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      {/* Centered container with bg - uses relative positioning */}
      <div className="relative z-10 flex h-full w-full overflow-hidden rounded-4xl">
        {/* Squares background - fills the container */}
        <div className="bg-green-1 absolute inset-0">
          <Squares
            speed={0.5}
            squareSize={60}
            direction="down"
            borderColor="#1F1F1F"
            hoverFillColor="#1F1F1F"
          />
        </div>

        {/* Your content goes here */}
        <div className="debug-2 relative z-10 flex h-full w-full items-center p-12 lg:flex-row">
          <div className="bg-black-2 flex h-full flex-2 flex-col rounded-4xl">
            <div className="flex h-full flex-col items-start justify-center gap-12 px-8 text-left">
              <h1 className="text-8xl">
                Tired of Guessing if your Training is Working?
              </h1>
              <div className="flex h-[200px] w-full flex-row gap-2">
                <GlassSurface className="flex-1" borderRadius={24}>
                  <h2>Glass Surface Content</h2>
                </GlassSurface>
                <GlassSurface className="flex-1" borderRadius={24}>
                  <h2>highlight 2</h2>
                </GlassSurface>
                <GlassSurface className="flex-1" borderRadius={24}>
                  <h2>Glass Surface Content</h2>
                </GlassSurface>
              </div>
            </div>
          </div>
          <div className="debug-3 relative flex h-full flex-1 flex-col items-center justify-center overflow-hidden rounded-4xl">
            <Iphone className="h-full w-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
