import { cn } from "@/lib/cn";

/** The evidence line under a result: instrument · items · scale · what it's compared with. */
export function MethodNote({ parts, className }: { parts: (string | null | false | undefined)[]; className?: string }) {
  const shown = parts.filter(Boolean) as string[];
  return (
    <p className={cn("mt-5 flex flex-wrap gap-x-2 gap-y-1 label text-ink-3", className)}>
      <span className="text-ink">Method</span>
      {shown.map((p, i) => (
        <span key={i}>
          <span aria-hidden className="pr-2 text-ink-4">·</span>
          {p}
        </span>
      ))}
    </p>
  );
}
