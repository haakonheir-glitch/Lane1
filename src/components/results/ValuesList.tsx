import type { ValueScore } from "@/lib/scoring/values";
import { pad2 } from "@/lib/format";

/** O*NET Work Importance Locator: six values, scored from the card sort (Σ column × multiplier). */
export function ValuesList({ values }: { values: ValueScore[] }) {
  const max = Math.max(...values.map((v) => v.score), 1);
  return (
    <ol className="border-t border-rule-strong">
      {values.map((v) => (
        <li key={v.id} className="grid grid-cols-[32px_1fr_auto] items-center gap-x-4 border-b border-rule py-4 sm:grid-cols-[40px_220px_1fr_64px]">
          <span className="font-mono text-small text-ink-3">{pad2(v.rank)}</span>
          <span className="text-body text-ink">{v.label}</span>
          <span className="hidden h-1 bg-rule sm:block" aria-hidden>
            <span className="block h-full bg-ink" style={{ width: `${(v.score / max) * 100}%` }} />
          </span>
          <span className="text-right font-mono text-small text-ink">{v.score}</span>
        </li>
      ))}
    </ol>
  );
}
