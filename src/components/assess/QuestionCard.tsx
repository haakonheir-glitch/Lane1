"use client";

import { useId } from "react";
import { Kbd } from "@/components/ui/Misc";
import { cn } from "@/lib/cn";

/**
 * One question per screen. Presentational: keyboard handling lives in the runner
 * so shortcuts work without focusing the card.
 */
export function QuestionCard({
  index,
  total,
  prompt,
  instruction,
  anchors,
  value,
  onSelect,
}: {
  index: number;
  total: number;
  prompt: string;
  instruction: string;
  anchors: string[];
  value: number | undefined;
  onSelect: (value: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <p className="label text-ink-3">
        Q {String(index).padStart(2, "0")} / {total}
      </p>
      <p className="mt-2 text-small text-ink-3">{instruction}</p>
      <h2 id={id} className="mt-8 text-h1 font-medium text-ink">
        {prompt}
      </h2>

      <div role="radiogroup" aria-labelledby={id} className="mt-10 flex flex-col border-t border-rule sm:mt-12">
        {anchors.map((anchor, i) => {
          const n = i + 1;
          const checked = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked || (value === undefined && n === 1) ? 0 : -1}
              onClick={() => onSelect(n)}
              className={cn(
                "group grid h-14 grid-cols-[32px_1fr_auto] items-center gap-4 border-b px-3 text-left transition-quiet",
                checked ? "border-ink bg-ink text-bg" : "border-rule text-ink hover:bg-surface",
              )}
            >
              <span className={cn("font-mono text-small", checked ? "text-bg" : "text-ink-3")}>{n}</span>
              <span className="text-body">{anchor}</span>
              <Kbd className={cn("hidden sm:inline-flex", checked && "border-bg/40 text-bg")}>{n}</Kbd>
            </button>
          );
        })}
      </div>
    </div>
  );
}
