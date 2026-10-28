import { ChevronRight } from "lucide-react";
import { entryLabel, entryTerm } from "@/lib/lanes/labels";
import { bandLabel } from "@/lib/matching/fit";
import type { LaneRowData } from "@/lib/lanes/types";
import { BandTag, FitIndicator, fitWords } from "./FitIndicator";
import { cn } from "@/lib/cn";

/**
 * Lane Map row: name and facts · band · relative-fit indicator · chevron.
 * Renders as a button when `onSelect` is given, otherwise as static content.
 */
export function LaneRow({ lane, active, onSelect, showFamily }: { lane: LaneRowData; active?: boolean; onSelect?: () => void; showFamily?: boolean }) {
  const body = (
    <>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-baseline gap-x-2 text-body text-ink">
          {lane.name}
          {lane.current ? <span className="label text-accent">Your current career</span> : lane.considering ? <span className="label text-accent">Considering</span> : null}
          {lane.provenance === "estimated" ? <span className="label text-caution">Estimated career data</span> : null}
        </span>
        <span className="label text-ink-3">
          {showFamily ? `${lane.familyName} · ` : ""}
          <span title={`Entry: ${entryTerm[lane.entry]}`}>{entryLabel[lane.entry]}</span>
        </span>
      </span>
      <span className="col-start-1 row-start-2 flex items-center gap-3 md:col-start-auto md:row-start-auto">
        <BandTag band={lane.band} />
        <span className="sr-only">
          {bandLabel[lane.band]}: fit {fitWords(lane.vsAverage, lane.band)}.
        </span>
        <FitIndicator vsAverage={lane.vsAverage} se={lane.se} className="min-w-16 flex-1" />
      </span>
      {onSelect ? (
        <ChevronRight
          aria-hidden
          strokeWidth={1.5}
          className={cn("col-start-2 row-span-2 row-start-1 size-4 self-center transition-quiet md:col-start-auto md:row-span-1 md:row-start-auto", active ? "translate-x-0.5 text-accent" : "text-ink-3")}
        />
      ) : null}
    </>
  );

  const grid = "grid w-full items-center gap-x-4 gap-y-2 py-4 text-left grid-cols-[minmax(0,1fr)_16px] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_16px]";

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(grid, "-mx-2 rounded-xs px-2 transition-quiet hover:bg-surface", active && "bg-surface")}
      >
        {body}
      </button>
    );
  }
  return <div className={cn(grid, "md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]")}>{body}</div>;
}
