import { TopBar } from "@/components/shell/TopBar";
import { Skeleton } from "@/components/ui/Misc";

/** The hub's layout, empty: intro on the left, the report miniature on the right. */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true">
      <TopBar title="Assessment" />
      <main className="page flex-1 pt-10 pb-24 sm:pt-12 lg:mx-0 lg:max-w-[calc(1200px+96px)]">
        <span className="sr-only">Loading the assessment</span>
        <div className="max-w-content">
          <Skeleton className="w-40" />
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
            <Skeleton className="mt-8" lines={5} />
            <div className="mt-4 h-[460px] rounded-sm border border-paper-edge bg-paper" />
          </div>
        </div>
      </main>
    </div>
  );
}
