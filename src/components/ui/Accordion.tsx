"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Accordion({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <div className="border-t border-rule">
      {items.map((item) => (
        <AccordionItem key={item.q} title={item.q}>
          {item.a}
        </AccordionItem>
      ))}
    </div>
  );
}

function AccordionItem({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="border-b border-rule">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-start justify-between gap-6 py-5 text-left text-body-l text-ink transition-quiet hover:text-ink-2"
        >
          <span>{title}</span>
          <span aria-hidden className="mt-0.5 font-mono text-body text-ink-3">
            {open ? "−" : "+"}
          </span>
        </button>
      </h3>
      <div
        id={id}
        role="region"
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className="max-w-reading pb-6 text-body text-ink-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
