import { IntervalScale } from "@/components/data/IntervalScale";
import type { FitRange } from "@/lib/lanes/types";
import { cn } from "@/lib/cn";

/**
 * The drawn range of each matching v2 fit. Fulfilment fit is relative to the person (50 = their
 * average career path; most career paths fall 30–70); ability fit is 0–100 with 100 = no shortfall
 * (most fall 40–100). Values outside are drawn at the edge.
 */
export const FIT_SCALE = {
  fulfilment: { lo: 30, hi: 70, ref: 50, refTitle: "Your average career path", ticks: [40, 60] },
  ability: { lo: 40, hi: 100, ref: null, refTitle: undefined, ticks: [60, 80] },
} as const;

export const fitPos = (kind: keyof typeof FIT_SCALE, v: number) => {
  const s = FIT_SCALE[kind];
  return Math.max(0, Math.min(100, ((v - s.lo) / (s.hi - s.lo)) * 100));
};

/** Words for a fit, for screen readers and figures: "62, 80% of draws 58–66". */
export const fitText = (r: FitRange) => `${Math.round(r.mean)}, 80% of draws ${Math.round(r.p10)}–${Math.round(r.p90)}`;

/** One v2 fit as an expected value with the range 80% of the draws fall in. Server or client. */
export function FitRangeBar({ range, kind, label, className }: { range: FitRange | null; kind: keyof typeof FIT_SCALE; label: string; className?: string }) {
  const s = FIT_SCALE[kind];
  if (!range) return <div className={cn("h-4 w-full rounded-xs border border-dashed border-rule", className)} aria-label={`${label}: not enough data`} role="img" />;
  return (
    <div role="meter" aria-label={label} aria-valuemin={kind === "ability" ? 0 : undefined} aria-valuemax={kind === "ability" ? 100 : undefined} aria-valuenow={Math.round(range.mean)} aria-valuetext={fitText(range)} className={cn("relative h-4 w-full", className)}>
      <IntervalScale
        point={fitPos(kind, range.mean)}
        lo={fitPos(kind, range.p10)}
        hi={fitPos(kind, range.p90)}
        ticks={s.ticks.map((t) => fitPos(kind, t))}
        refAt={s.ref === null ? null : fitPos(kind, s.ref)}
        refTitle={s.refTitle}
      />
    </div>
  );
}
