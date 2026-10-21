import { cn } from "@/lib/cn";
import type { Confidence } from "@/lib/types";

const filled: Record<Confidence, number> = { high: 3, med: 2, low: 1 };
const text: Record<Confidence, string> = { high: "HIGH", med: "MED", low: "LOW" };

export function ConfidenceBadge({ level, className }: { level: Confidence; className?: string }) {
  const n = filled[level];
  const tone = level === "low" ? "text-caution" : "text-ink-2";
  return (
    <span className={cn("inline-flex items-center gap-2", tone, className)} title={`Confidence: ${text[level].toLowerCase()}`}>
      <span aria-hidden className="inline-flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("h-2 w-1.5", i < n ? "bg-current" : "bg-rule-strong")} />
        ))}
      </span>
      <span className="label">
        <span className="sr-only">Confidence </span>
        {text[level]}
      </span>
    </span>
  );
}
