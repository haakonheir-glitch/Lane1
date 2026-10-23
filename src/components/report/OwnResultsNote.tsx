import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Shown on pages that render the person's own results. Interests, values, personality and lane
 * fit are compared with the person's own other scores; reasoning with provisional norms.
 */
export function OwnResultsNote({ className }: { className?: string }) {
  return (
    <aside role="note" className={cn("flex flex-col gap-1 rounded-sm border border-rule-strong bg-surface px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4", className)}>
      <span className="label text-positive">Your results</span>
      <p className="text-small text-ink-2">
        Built from your own answers. Lane fit, interests, values and personality are compared with your own other scores (your relative
        strengths); reasoning is compared with adults 18–35 using provisional norms.{" "}
        <Link href="/method#norms" className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
          Why
        </Link>
      </p>
    </aside>
  );
}
