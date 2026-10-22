import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Shown on pages that render the person's own results before population norms exist:
 * scores are compared with the person's own other scores, never with other people.
 */
export function OwnResultsNote({ className }: { className?: string }) {
  return (
    <aside role="note" className={cn("flex flex-col gap-1 rounded-sm border border-rule-strong bg-surface px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4", className)}>
      <span className="label text-positive">Your results</span>
      <p className="text-small text-ink-2">
        Built from your own answers. Each score is compared with your other scores (your relative strengths), not with other people:
        that needs published norm tables, which aren&apos;t loaded yet.{" "}
        <Link href="/method#norms" className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
          Why
        </Link>
      </p>
    </aside>
  );
}
