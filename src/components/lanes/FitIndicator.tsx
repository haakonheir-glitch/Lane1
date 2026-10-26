import type { Band } from "@/lib/matching";
import { bandLabel } from "@/lib/matching/fit";
import { cn } from "@/lib/cn";

/** Fit band as a tag. Strong is the only one drawn in full ink. */
export function BandTag({ band, className }: { band: Band; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-xs border px-1.5 font-mono text-[11px] uppercase tracking-label",
        band === "strong" ? "border-ink text-ink" : band === "testing" ? "border-rule-strong text-ink-2" : band === "unlikely" ? "border-rule text-ink-3" : "border-dashed border-rule text-ink-3",
        className,
      )}
    >
      {bandLabel[band]}
    </span>
  );
}

const RANGE = 1.5; // z units either side of the person's average lane

/**
 * Fit relative to the person's own average lane: a point with its 90% interval on a
 * −1.5…+1.5 scale around a centre line. No number: bands, not ranks.
 */
export function FitIndicator({ vsAverage, se, className }: { vsAverage: number | null; se: number | null; className?: string }) {
  if (vsAverage === null || se === null) {
    return <div className={cn("h-3 w-full rounded-xs border border-dashed border-rule", className)} aria-hidden />;
  }
  const x = (v: number) => (Math.min(RANGE, Math.max(-RANGE, v)) / RANGE) * 50 + 50;
  const half = 1.645 * se;
  const lo = x(vsAverage - half);
  const hi = x(vsAverage + half);
  return (
    <div className={cn("relative h-3 w-full", className)} aria-hidden>
      <div className="absolute inset-x-0 top-1/2 h-px bg-rule" />
      <div className="absolute left-1/2 top-0 h-3 w-px bg-ink-4" />
      <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-data-band" style={{ left: `${lo}%`, width: `${Math.max(1, hi - lo)}%` }} />
      <div className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" style={{ left: `${x(vsAverage)}%` }} />
    </div>
  );
}

/** Words for the indicator, for screen readers and the detail panel. */
export function fitWords(vsAverage: number | null): string {
  if (vsAverage === null) return "not enough data";
  const a = Math.abs(vsAverage);
  const how = a < 0.15 ? "about the same as" : a < 0.5 ? (vsAverage > 0 ? "a little above" : "a little below") : vsAverage > 0 ? "well above" : "well below";
  return `${how} your average career path`;
}
