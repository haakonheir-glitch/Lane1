import { TopBar } from "@/components/shell/TopBar";
import { Skeleton } from "@/components/ui/Misc";

/** The report's own layout, empty: rail, cover and summary sheet at their final sizes, so nothing shifts. */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true">
      <TopBar title="Profile report" />
      <main className="page flex-1 pt-10 pb-24 sm:pt-12 lg:mx-0 lg:max-w-[calc(1200px+96px)]">
        <span className="sr-only">Loading your report</span>
        <div className="grid gap-10 xl:grid-cols-[168px_minmax(0,1fr)]">
          <Skeleton className="hidden pt-8 xl:flex" lines={10} />
          <div className="flex min-w-0 flex-col gap-8">
            <div className="flex min-h-[560px] flex-col justify-between border border-paper-edge bg-paper p-8 sm:p-12">
              <Skeleton className="w-1/3" />
              <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_300px]">
                <Skeleton lines={2} />
                <div className="mx-auto size-[300px] rounded-full border border-rule" />
              </div>
              <Skeleton className="w-1/2" />
            </div>
            <div className="min-h-[900px] border border-paper-edge bg-paper p-8 sm:p-12">
              <Skeleton lines={6} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
