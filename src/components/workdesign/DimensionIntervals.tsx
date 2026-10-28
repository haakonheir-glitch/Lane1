import { IntervalScale } from "@/components/data/IntervalScale";
import { RelativeTag } from "@/components/results/RelativeTag";
import { cn } from "@/lib/cn";
import type { Relative } from "@/lib/workdesign/person";

export type DimensionRow = {
  id: string;
  name: string;
  /** The archetype a value mode is shown as (a metaphor). */
  archetype?: string;
  poles: [string, string];
  value: number | null;
  lo: number | null;
  hi: number | null;
  relative?: Relative;
  /** A second reference on the same scale (the career's level), drawn as an ink tick; your score then shows in the "your data" blue. */
  marker?: number | null;
};

const r0 = Math.round;

/**
 * Work Design dimensions with their 90% intervals on 0–100: one row each, the low and high poles
 * in words under the scale, the scale midpoint as the reference tick (these scores are anchored
 * on the questionnaire scales, not population percentiles, so 50 is the middle of the scale, not
 * an average person). A relative strength or weakness is tagged only when it passed the 1.96·SE
 * test (BLUEPRINT §7). `compact` stacks each row for narrow columns (the Career map's detail panel).
 * No hooks, so it renders on the server or inside a client component.
 */
export function DimensionIntervals({ rows, label, markerLabel, markerShort, compact }: { rows: DimensionRow[]; label: string; markerLabel?: string; markerShort?: string; compact?: boolean }) {
  return (
    <ul aria-label={label} className="divide-y divide-rule border-y border-rule">
      {rows.map((r) => (
        <li key={r.id} className={cn("grid gap-x-6 gap-y-2 py-3", compact ? "grid-cols-[minmax(0,1fr)_auto] items-baseline" : "sm:grid-cols-[minmax(0,1.1fr)_96px_minmax(0,2fr)] sm:items-center")}>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-body text-ink">{r.name}</span>
            {r.archetype ? <span className="text-small text-ink-3">· {r.archetype}</span> : null}
            {r.relative ? <RelativeTag r={r.relative} /> : null}
          </div>
          <span className="font-mono text-small text-ink tabular">
            {r.value === null ? (
              <span className="text-ink-3">not measured</span>
            ) : (
              <>
                {r0(r.value)}
                <span className="text-label text-ink-3"> {r0(r.lo!)}–{r0(r.hi!)}</span>
              </>
            )}
            {markerShort && r.marker !== null && r.marker !== undefined ? <span className="text-label text-ink-3"> · {markerShort} {r0(r.marker)}</span> : null}
          </span>
          <div className={cn(compact && "col-span-2")}>
            {r.value === null ? (
              <div className="h-4 rounded-xs border border-dashed border-rule" aria-hidden />
            ) : (
              <div
                role="meter"
                aria-label={r.name}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={r0(r.value)}
                aria-valuetext={`${r0(r.value)} of 100, 90% range ${r0(r.lo!)} to ${r0(r.hi!)}${r.marker !== null && r.marker !== undefined ? `; ${markerLabel ?? "reference"} ${r0(r.marker)}` : ""}`}
                className="relative h-4 w-full"
              >
                <IntervalScale point={r.value} lo={r.lo!} hi={r.hi!} ticks={[25, 75]} refTitle="Middle of the scale" marker={r.marker} markerTitle={markerLabel} emphasis={r.marker !== undefined} />
              </div>
            )}
            <div className="mt-1 flex justify-between gap-4 text-label text-ink-3">
              <span>{r.poles[0]}</span>
              <span className="text-right">{r.poles[1]}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
