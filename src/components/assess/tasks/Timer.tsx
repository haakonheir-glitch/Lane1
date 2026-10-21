import { fmtTimer } from "@/lib/format";
import { cn } from "@/lib/cn";

export function Timer({ left, limit }: { left: number; limit: number }) {
  if (!limit) return <span className="label text-ink-3">Untimed practice</span>;
  return (
    <span role="timer" aria-label={`${Math.max(0, Math.ceil(left))} seconds left`} className={cn("font-mono text-h3", left <= 10 ? "text-caution" : "text-ink")}>
      {fmtTimer(left)}
    </span>
  );
}
