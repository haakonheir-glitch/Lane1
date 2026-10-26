"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export type RailItem = { id: string; n: string; title: string; locked?: boolean };

/**
 * The report's table of contents: numbered chapters, sticky on the left. The chapter in view is
 * marked; the list itself never moves or animates.
 */
export function ChapterRail({ items, className }: { items: RailItem[]; className?: string }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  return (
    <nav aria-label="Contents" className={cn("text-small", className)}>
      <p className="text-ink-3">Contents</p>
      <ol className="mt-3 flex flex-col border-l border-rule">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? "true" : undefined}
              className={cn(
                "-ml-px grid grid-cols-[28px_1fr] border-l py-1.5 pl-3 transition-quiet",
                active === i.id ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink",
                i.locked && "text-ink-4",
              )}
            >
              <span className="font-mono tabular">{i.n}</span>
              <span>{i.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
