import { cn } from "@/lib/cn";

/**
 * The instrument scale shared by every score bar: a hairline with minor ticks (like a dial),
 * the 90% interval as a solid band, the score as a crisp point, and the reference (median, the
 * person's own average or the scale midpoint) as a full-height tick. Positions are 0–100 (% of
 * the width). `marker` adds a second reference, drawn as a full-height ink tick (a career's level).
 */
export function IntervalScale({
  point,
  lo,
  hi,
  ticks,
  refAt = 50,
  refTitle,
  emphasis,
  marker,
  markerTitle,
}: {
  point: number;
  lo: number;
  hi: number;
  ticks: number[];
  refAt?: number | null;
  refTitle?: string;
  emphasis?: boolean;
  marker?: number | null;
  markerTitle?: string;
}) {
  return (
    <>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-rule-strong" />
      {ticks.map((t) => (
        <div key={t} className="absolute top-1/2 h-1.5 w-px -translate-y-1/2 bg-rule-strong" style={{ left: `${t}%` }} />
      ))}
      <div className={cn("absolute top-1/2 h-2 -translate-y-1/2", emphasis ? "bg-accent-wash" : "bg-data-band")} style={{ left: `${lo}%`, width: `${Math.max(0.5, hi - lo)}%` }} />
      {refAt !== null ? <div className="absolute inset-y-0 w-px bg-data-ref" style={{ left: `${refAt}%` }} title={refTitle} /> : null}
      {marker !== null && marker !== undefined ? <div className="absolute -inset-y-0.5 w-[3px] -translate-x-1/2 bg-ink-2" style={{ left: `${marker}%` }} title={markerTitle} /> : null}
      <div className={cn("absolute inset-y-0 w-[2px] -translate-x-1/2", emphasis ? "bg-accent" : "bg-ink")} style={{ left: `${point}%` }} />
    </>
  );
}
