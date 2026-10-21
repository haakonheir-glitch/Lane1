import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Shown on every page that renders sample results. Your own answers are saved and scored,
 * but results are shown only once published norms are loaded (PLAN.md D1/D2).
 */
export function SampleBanner({ what = "results", className }: { what?: string; className?: string }) {
  return (
    <aside role="note" className={cn("flex flex-col gap-1 rounded-sm border border-rule-strong bg-surface px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4", className)}>
      <span className="label text-caution">Sample</span>
      <p className="text-small text-ink-2">
        These are sample {what} for a fictional person. Your own answers are saved and scored; your results appear here once
        the published norm tables are loaded.{" "}
        <Link href="/method#norms" className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
          Why
        </Link>
      </p>
    </aside>
  );
}
