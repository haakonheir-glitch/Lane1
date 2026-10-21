import { cn } from "@/lib/cn";

/** N segments: done = ink, current = accent, remaining = rule. */
export function SegmentedProgress({
  total,
  done,
  current,
  label,
  className,
}: {
  total: number;
  done: number;
  current?: number;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      className={cn("flex w-full gap-0.5", className)}
    >
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const state = n === current ? "current" : n <= done ? "done" : "todo";
        return (
          <span
            key={i}
            className={cn("h-1 flex-1", state === "current" ? "bg-accent" : state === "done" ? "bg-ink" : "bg-rule")}
          />
        );
      })}
    </div>
  );
}
