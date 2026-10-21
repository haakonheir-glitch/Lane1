import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Rule({ strong, className }: { strong?: boolean; className?: string }) {
  return <hr className={cn("border-0 border-t", strong ? "border-rule-strong" : "border-rule", className)} />;
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-xs border border-rule px-2 label text-ink-2", className)}>
      {children}
    </span>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-rule-strong px-1 font-mono text-label text-ink-3",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** Hairline shimmer skeleton: a 1px line with a travelling highlight. */
export function Skeleton({ className, lines = 1 }: { className?: string; lines?: number }) {
  return (
    <div aria-hidden className={cn("flex flex-col gap-4", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="relative h-px overflow-hidden bg-rule" style={{ width: `${100 - ((i * 17) % 40)}%` }}>
          <div className="absolute inset-y-0 left-0 w-1/4 animate-shimmer bg-rule-strong" />
        </div>
      ))}
    </div>
  );
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
