import { TopBar } from "@/components/shell/TopBar";
import { Skeleton } from "@/components/ui/Misc";

/** The Career map's layout, empty: heading, lead and the best-fit card at their final sizes. */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true">
      <TopBar title="Career map" />
      <main className="page flex-1 pt-10 pb-24 sm:pt-12 lg:mx-0 lg:max-w-[calc(1200px+96px)]">
        <span className="sr-only">Loading your Career map</span>
        <div className="max-w-content">
          <div className="h-[66px]" />
          <Skeleton className="w-40" />
          <div className="mt-5 h-[68px] w-[min(100%,520px)]" />
          <Skeleton className="mt-6 max-w-[60ch]" lines={3} />
          <div className="mt-20 border-t border-ink pt-3">
            <Skeleton className="w-32" />
            <div className="mt-24 h-[420px] rounded-sm border border-ink bg-paper" />
          </div>
        </div>
      </main>
    </div>
  );
}
