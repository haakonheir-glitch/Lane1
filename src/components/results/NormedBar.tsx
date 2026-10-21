import type { Normed } from "@/lib/scoring/core";
import { tToBar } from "@/lib/view/profile";
import { cn } from "@/lib/cn";

/**
 * A norm-referenced score on the T scale (drawn 20–80): point, shaded 90% interval and the
 * population median tick at T 50. BLUEPRINT §7: every score is shown with its interval.
 */
export function NormedBar({ n, label, emphasis, className }: { n: Normed; label: string; emphasis?: boolean; className?: string }) {
  const v = tToBar(n.t);
  const lo = tToBar(n.ci[0]);
  const hi = tToBar(n.ci[1]);
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={20}
      aria-valuemax={80}
      aria-valuenow={Math.round(n.t)}
      aria-valuetext={`T ${Math.round(n.t)}, 90% interval ${Math.round(n.ci[0])} to ${Math.round(n.ci[1])}, percentile ${n.percentileBand[0]} to ${n.percentileBand[1]}`}
      className={cn("relative h-3 w-full", className)}
    >
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-rule" />
      <div className={cn("absolute top-1/2 h-2 -translate-y-1/2 opacity-25", emphasis ? "bg-accent" : "bg-ink")} style={{ left: `${lo}%`, width: `${hi - lo}%` }} />
      <div className={cn("absolute top-0 h-3 w-0.5 -translate-x-1/2", emphasis ? "bg-accent" : "bg-ink")} style={{ left: `${v}%` }} />
      <div className="absolute top-0 h-3 w-px bg-ink-4" style={{ left: "50%" }} title="Population median (T 50)" />
    </div>
  );
}

/** Mono "T 58 ±5 · P62–84". */
export function NormedFigure({ n }: { n: Normed }) {
  return (
    <span className="font-mono text-small text-ink">
      <span className="whitespace-nowrap">
        T {Math.round(n.t)}
        <span className="text-label text-ink-3"> ±{Math.round((n.ci[1] - n.ci[0]) / 2)}</span>
      </span>
      {/* Wraps as a unit on narrow screens, never mid-range. */}
      <span className="ml-3 inline-block whitespace-nowrap text-label text-ink-3">
        P{n.percentileBand[0]}–{n.percentileBand[1]}
      </span>
    </span>
  );
}
