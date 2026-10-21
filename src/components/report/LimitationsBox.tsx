import type { ReactNode } from "react";

export function LimitationsBox({ title, items, footer }: { title: string; items: string[]; footer?: ReactNode }) {
  return (
    <aside className="rounded-sm border border-rule-strong bg-surface p-6 sm:p-8">
      <p className="label text-ink-3">Limitations</p>
      <h3 className="mt-3 text-h3 font-medium text-ink">{title}</h3>
      <ol className="mt-6 flex flex-col gap-4">
        {items.map((item, i) => (
          <li key={i} className="grid grid-cols-[32px_1fr] gap-2 text-body text-ink-2">
            <span className="font-mono text-small text-ink-3">{String(i + 1).padStart(2, "0")}</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
      {footer ? <div className="mt-6 border-t border-rule pt-4 text-small text-ink-3">{footer}</div> : null}
    </aside>
  );
}
