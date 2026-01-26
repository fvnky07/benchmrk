'use client';
import Squares from '@/components/Squares';
import { Iphone } from '@/components/ui/iphone';

export default function Hero() {
  return (
    <section className="debug-5 relative flex h-screen w-full items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="bg-green-1 absolute inset-0 m-10 rounded-4xl">
        <Squares
          speed={0.5}
          squareSize={40}
          direction="down"
          borderColor="#1F1F1F"
          hoverFillColor="#1F1F1F"
        />
      </div>
    </section>
  );
}
