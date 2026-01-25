import { Iphone } from '@/components/ui/iphone';

export default function Hero() {
  return (
    <section className="flex h-screen w-full items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Content container - uses flex to center, responsive max-width */}
      <div className="debug-1 flex h-full w-full max-w-sm flex-col gap-8 sm:max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-7xl">
        {/* iPhone wrapper - constrains size and maintains aspect ratio */}
        <div className="bg-green-1 h-full w-full max-w-xs rounded-4xl p-12 sm:max-w-sm md:max-w-md lg:max-w-lg">
          <Iphone className="h-1/1 w-full" />
        </div>
      </div>
    </section>
  );
}
