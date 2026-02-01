import GridPattern from '@/components/ui/grid-pattern';

export default function WaitingList() {
  return (
    <section className="bg-black-1 relative flex h-screen w-full flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-4 lg:px-12">
      <GridPattern
        width={30}
        height={30}
        strokeColor="rgba(255,255,255, 0.3)"
      />
      <div className="debug-3 bg-black-2 relative z-10 flex h-full w-full flex-row overflow-hidden rounded-4xl p-2 shadow lg:p-0">
        <div className="debug-5 flex grow flex-row">
          <div>
            <h1 className="text-9xl">Join</h1>
          </div>
        </div>
        <div className="debug-4 grow"></div>
      </div>
    </section>
  );
}
