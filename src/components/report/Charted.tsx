import type { ReactNode } from "react";

/**
 * A charted report section with its paragraph from the written report beside it (below it on
 * narrower screens). Without written text the chart takes the full width.
 */
export function Charted({ text, stale, children }: { text?: string[]; stale?: boolean; children: ReactNode }) {
  if (!text?.length) return <>{children}</>;
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_288px] xl:gap-12">
      <div className="min-w-0">{children}</div>
      <aside className="border-t border-rule pt-4 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8" aria-label="From your written report">
        <p className="label text-ink-3">
          In words{stale ? <span className="ml-2 text-caution">· written before your latest scores</span> : null}
        </p>
        <div className="mt-3 flex flex-col gap-3 text-body text-ink-2">
          {text.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </aside>
    </div>
  );
}
