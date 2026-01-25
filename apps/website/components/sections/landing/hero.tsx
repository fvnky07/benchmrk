import { Iphone } from '@/components/ui/iphone';

export default function Hero() {
  return (
    <section className="flex h-screen w-full items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-5xl xl:max-w-7xl">
        <div className="mx-auto max-h-96 w-full sm:max-h-[28rem] md:max-h-[32rem] lg:max-h-[42rem] xl:max-h-screen">
          <Iphone className="h-full w-full" />
        </div>
      </div>
    </section>
  );
}
