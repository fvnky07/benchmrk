import React from 'react';
import { cn } from '@/lib/utils';
import { Iphone } from '@/components/ui/iphone';

interface HeroProps extends React.HTMLAttributes<HTMLDivElement> {
  fill?: string;
  children?: React.ReactNode;
}

const Hero = ({
  fill = '#fcffff',
  children,
  className,
  ...props
}: HeroProps) => (
  <section
    className={cn(
      'relative flex h-screen w-full items-center justify-center',
      className
    )}
    {...props}
  >
    <div className="relative h-full w-full">
      {/* Shape 1 - Left section, full height */}
      <div
        className="absolute top-0 left-0 h-full w-[75%] rounded-[32px_0px_32px_32px]"
        style={{ backgroundColor: fill }}
      >
        {/* Add content here */}
      </div>
      {/* Shape 2 - Top right section */}
      <div
        className="absolute top-0 right-0 left-[45%] h-[21.4%] rounded-[0px_32px_32px_0px]"
        style={{ backgroundColor: fill }}
      >
        {/* Add content here */}
      </div>
      {/* Negative Space 1 - Content container for empty region */}
      <div className="absolute top-[21.4%] right-0 bottom-0 left-[45%]">
        {/* Add content here */}
      </div>
      {/* iPhone - Full height, right div width */}
      <Iphone
        className="absolute top-0 right-0 bottom-0 left-[45%] z-50 h-full w-full"
        videoSrc="https://videos.pexels.com/video-files/8946986/8946986-uhd_1440_2732_25fps.mp4"
      />
      {/* Bridge 1 - Curved connector */}
      <svg
        className="pointer-events-none absolute top-[21.4%] left-[45%] h-8 w-8"
        viewBox="0 -32 32 32"
        preserveAspectRatio="none"
      >
        <path d="M 0 0 C 0 -23.872 5.76 -32 32 -32 H 0 Z" fill={fill} />
      </svg>
      {children}
    </div>
  </section>
);

export default Hero;
