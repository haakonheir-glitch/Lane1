import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Paper } from "./Paper";

/**
 * A report chapter on its own sheet: number, a small kicker (what was measured) and a headline
 * that states what is clearly true. `words` puts the written report's paragraph beside the
 * headline, above the chart it describes; `locked` shows the outline placeholder of a chapter
 * not included in this tier.
 */
export function Chapter({
  id,
  n,
  kicker,
  title,
  words,
  locked,
  children,
  className,
}: {
  id: string;
  n: string;
  kicker: string;
  title: ReactNode;
  words?: string[] | null;
  locked?: string;
  children?: ReactNode;
  className?: string;
}) {
  const head = (
    <div>
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-small text-ink-3 tabular">{n}</span>
        <p className="text-small text-ink-3">{kicker}</p>
      </div>
      <h2 id={`${id}-h`} className="mt-3 max-w-[28ch] text-h2 font-medium text-ink">
        {title}
      </h2>
    </div>
  );
  return (
    <Paper id={id} className={cn("p-8 sm:p-12", locked && "border-dashed bg-transparent", className)}>
      {words?.length && !locked ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
          {head}
          <aside className="border-t border-rule pt-4 lg:border-t-0 lg:border-l lg:pt-1 lg:pl-8" aria-label="From your written report">
            <p className="text-small text-ink-3">In words</p>
            <div className="mt-2 flex flex-col gap-3 text-body text-ink-2">
              {words.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </aside>
        </div>
      ) : (
        head
      )}
      {locked ? (
        <div className="mt-8 flex min-h-40 items-center justify-center rounded-xs border border-dashed border-rule-strong p-8 text-center">
          <p className="max-w-[48ch] text-body text-ink-2">{locked}</p>
        </div>
      ) : (
        <div className="mt-10">{children}</div>
      )}
    </Paper>
  );
}
