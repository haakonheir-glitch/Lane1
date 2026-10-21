import { cn } from "@/lib/cn";

/** Thin top progress bar. */
export function ProgressBar({ value, max, label, className }: { value: number; max: number; label: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn("h-0.5 w-full bg-rule", className)}
    >
      <div className="h-full bg-accent transition-[width] duration-200 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}
