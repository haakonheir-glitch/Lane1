import type { Relative } from "@/lib/scoring/relative";
import { relativeLabel } from "@/lib/view/profile";
import { cn } from "@/lib/cn";

/** Only "strength"/"weakness" are tagged; BLUEPRINT §7 requires the difference test to pass. */
export function RelativeTag({ r, showNone }: { r: Relative; showNone?: boolean }) {
  if (r === "none" && !showNone) return null;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-xs border px-1.5 font-mono text-[11px] uppercase tracking-label",
        r === "strength" ? "border-ink text-ink" : r === "weakness" ? "border-rule-strong text-ink-2" : "border-rule text-ink-3",
      )}
    >
      {relativeLabel[r]}
    </span>
  );
}
