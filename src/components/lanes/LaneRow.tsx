import { ChevronRight } from "lucide-react";
import { ScoreBar } from "@/components/data/ScoreBar";
import { PayoffGlyph } from "@/components/data/PayoffGlyph";
import { ConfidenceBadge } from "@/components/data/ConfidenceBadge";
import { ciHalf, groupLabel, pad2 } from "@/lib/format";
import { payoffLabel } from "@/lib/scoring";
import type { RankedLane } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Ranked Lane Map row: rank · name · relative-fit bar · payoff glyph · confidence · chevron.
 * Renders as a button when `onSelect` is given, otherwise as static content.
 */
export function LaneRow({
  lane,
  emphasis,
  active,
  onSelect,
  compact,
}: {
  lane: RankedLane;
  emphasis?: boolean;
  active?: boolean;
  onSelect?: () => void;
  compact?: boolean;
}) {
  const score = lane.sortScore;
  const rank = `${lane.tied ? "=" : ""}${pad2(lane.rank)}`;
  const body = (
    <>
      <span className={cn("font-mono text-small", emphasis ? "text-ink" : "text-ink-3")} aria-label={`Rank ${lane.rank}${lane.tied ? ", tied" : ""}`}>
        {rank}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("text-body text-ink", !compact && "truncate")}>{lane.name}</span>
        <span className="label text-ink-3">
          {groupLabel[lane.group]}
          <span className={cn(compact ? "" : "md:hidden")}> · {payoffLabel[lane.payoff]}</span>
        </span>
      </span>
      <span
        className={cn(
          "col-start-2 row-start-2 flex items-center gap-3",
          compact ? "sm:col-start-auto sm:row-start-auto" : "md:col-start-auto md:row-start-auto",
        )}
      >
        <ScoreBar score={score} label={`${lane.name} relative fit`} emphasis={emphasis} showMedian={false} className="flex-1" />
        <span className="w-14 shrink-0 text-right font-mono text-small text-ink">
          {Math.round(score.value)}
          <span className="text-label text-ink-3"> ±{ciHalf(score)}</span>
        </span>
      </span>
      {!compact ? (
        <span className="hidden md:flex md:justify-center">
          <PayoffGlyph type={lane.payoff} position={lane.payoffPosition} />
        </span>
      ) : null}
      <span className={cn("hidden", compact ? "sm:flex" : "md:flex")}>
        <ConfidenceBadge level={lane.confidence} />
      </span>
      {onSelect ? (
        <ChevronRight
          aria-hidden
          strokeWidth={1.5}
          className={cn(
            "col-start-3 row-span-2 row-start-1 size-4 transition-quiet md:col-start-auto md:row-span-1 md:row-start-auto",
            active ? "translate-x-0.5 text-accent" : "text-ink-3")}
        />
      ) : null}
    </>
  );

  const grid = cn(
    "grid w-full items-center gap-x-4 gap-y-2 py-4 text-left",
    compact
      ? "grid-cols-[32px_minmax(0,1fr)] sm:grid-cols-[32px_minmax(0,1.3fr)_minmax(0,1fr)_auto]"
      : "grid-cols-[32px_minmax(0,1fr)_16px] md:grid-cols-[40px_minmax(0,1.3fr)_minmax(0,1fr)_64px_88px_16px]",
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(grid, "px-2 -mx-2 rounded-xs transition-quiet hover:bg-surface", active && "bg-surface")}
      >
        {body}
      </button>
    );
  }
  return <div className={grid}>{body}</div>;
}
