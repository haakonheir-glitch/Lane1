import type { Normed } from "@/lib/scoring/core";
import type { SelfScore } from "@/lib/scoring/types";
import { fmtPct, pctBand, tToBar } from "@/lib/view/profile";
import { cn } from "@/lib/cn";

/**
 * The instrument scale shared by every score bar: a hairline with minor ticks (like a dial),
 * the 90% interval as a solid band, the score as a crisp point, and the reference (median or
 * the person's own average) as a full-height tick. Positions are 0–100 (% of the width).
 */
function Gauge({ point, lo, hi, ticks, refTitle, emphasis }: { point: number; lo: number; hi: number; ticks: number[]; refTitle: string; emphasis?: boolean }) {
  return (
    <>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-rule-strong" />
      {ticks.map((t) => (
        <div key={t} className="absolute top-1/2 h-1.5 w-px -translate-y-1/2 bg-rule-strong" style={{ left: `${t}%` }} />
      ))}
      <div className={cn("absolute top-1/2 h-2 -translate-y-1/2", emphasis ? "bg-accent-wash" : "bg-data-band")} style={{ left: `${lo}%`, width: `${Math.max(0.5, hi - lo)}%` }} />
      <div className="absolute inset-y-0 w-px bg-data-ref" style={{ left: "50%" }} title={refTitle} />
      <div className={cn("absolute inset-y-0 w-[2px] -translate-x-1/2", emphasis ? "bg-accent" : "bg-ink")} style={{ left: `${point}%` }} />
    </>
  );
}

const T_TICKS = [30, 40, 60, 70].map(tToBar);

/**
 * A norm-referenced score on the T scale (drawn 20–80): point, 90% interval and the
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
      aria-valuetext={`T ${Math.round(n.t)}, 90% interval ${Math.round(n.ci[0])} to ${Math.round(n.ci[1])}, percentile ${pctBand(n.percentileBand)[0]} to ${pctBand(n.percentileBand)[1]}`}
      className={cn("relative h-4 w-full", className)}
    >
      <Gauge point={v} lo={lo} hi={hi} ticks={T_TICKS} refTitle="Population median (T 50)" emphasis={emphasis} />
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
        {fmtPct(n.percentileBand)}
      </span>
    </span>
  );
}

const SELF_RANGE = 2; // SD units either side of the person's own average
const SELF_MIN = -SELF_RANGE;

/**
 * A score relative to the person's own other scales (no population norms): point and 90%
 * range on −2…+2 of their own spread, with the centre line at their own average.
 */
export function SelfBar({ s, label, className }: { s: SelfScore; label: string; className?: string }) {
  const x = (v: number) => (Math.min(SELF_RANGE, Math.max(-SELF_RANGE, v)) / SELF_RANGE) * 50 + 50;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={SELF_MIN}
      aria-valuemax={SELF_RANGE}
      aria-valuenow={Math.round(s.z * 10) / 10}
      aria-valuetext={`${fmtSelf(s.z)} compared with your own average, 90% range ${fmtSelf(s.ci[0])} to ${fmtSelf(s.ci[1])}`}
      className={cn("relative h-4 w-full", className)}
    >
      <Gauge point={x(s.z)} lo={x(s.ci[0])} hi={x(s.ci[1])} ticks={[25, 75]} refTitle="Your own average" />
    </div>
  );
}

const fmtSelf = (z: number) => `${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(1)}`;

/** Mono "raw 3.42 · +0.8 vs you" for a self-relative score. */
export function SelfFigure({ raw, s }: { raw: number | null; s: SelfScore }) {
  return (
    <span className="font-mono text-small text-ink">
      <span className="whitespace-nowrap">{fmtSelf(s.z)}</span>
      <span className="ml-2 inline-block whitespace-nowrap text-label text-ink-3">raw {raw === null ? "—" : Number.isInteger(raw) ? raw : raw.toFixed(2)}</span>
    </span>
  );
}
