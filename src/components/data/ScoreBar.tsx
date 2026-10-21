import { cn } from "@/lib/cn";
import type { Score } from "@/lib/types";

/**
 * 4px bar with a shaded 80% interval and an optional population-median tick.
 * Scale is 0–100.
 */
export function ScoreBar({
  score,
  label,
  emphasis,
  showMedian = true,
  tone = "ink",
  className,
}: {
  score: Score;
  label: string;
  emphasis?: boolean;
  showMedian?: boolean;
  tone?: "ink" | "muted";
  className?: string;
}) {
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  const v = clamp(score.value);
  const [lo, hi] = [clamp(score.ci[0]), clamp(score.ci[1])];
  const fill = emphasis ? "bg-accent" : tone === "muted" ? "bg-ink-4" : "bg-ink";
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      aria-valuetext={`${Math.round(v)} out of 100, interval ${Math.round(lo)} to ${Math.round(hi)}`}
      className={cn("relative h-3 w-full", className)}
    >
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-rule" />
      <div className={cn("absolute left-0 top-1/2 h-1 -translate-y-1/2", fill)} style={{ width: `${v}%` }} />
      <div
        className={cn("absolute top-1/2 h-2 -translate-y-1/2 opacity-25", emphasis ? "bg-accent" : "bg-ink")}
        style={{ left: `${lo}%`, width: `${hi - lo}%` }}
      />
      {showMedian && score.median !== undefined ? (
        <div className="absolute top-0 h-3 w-px bg-ink-2" style={{ left: `${clamp(score.median)}%` }} title="Population median" />
      ) : null}
    </div>
  );
}
