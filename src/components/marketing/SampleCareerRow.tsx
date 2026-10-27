import type { LaneRowData } from "@/lib/lanes/types";
import { entryLabel, entryTerm } from "@/lib/lanes/labels";
import { bandLabel } from "@/lib/matching/fit";
import { BandTag, FitIndicator, fitWords } from "@/components/lanes/FitIndicator";

/**
 * One row of the landing page's sample Career map: the career path and its family, then one line
 * of facts in plain words across the full width; the band and the fit dot sit in a narrow column
 * on the right. The app's own rows use the Career map's terms.
 */
export function SampleCareerRow({ lane }: { lane: LaneRowData }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_112px] items-start gap-x-5 gap-y-2 py-4">
      <span className="flex min-w-0 flex-col">
        <span className="text-body text-ink">{lane.name}</span>
        <span className="text-small text-ink-3">{lane.familyName}</span>
      </span>
      <span className="flex flex-col items-end gap-2 pt-0.5">
        <BandTag band={lane.band} />
        <span className="sr-only">
          {bandLabel[lane.band]}: fit {fitWords(lane.vsAverage, lane.band)}.
        </span>
        <FitIndicator vsAverage={lane.vsAverage} se={lane.se} className="w-full" />
      </span>
      <span className="col-span-2 text-small text-ink-2 sm:truncate">
        <span title={`Entry: ${entryTerm[lane.entry]}`}>{entryLabel[lane.entry]}</span>
      </span>
    </div>
  );
}
