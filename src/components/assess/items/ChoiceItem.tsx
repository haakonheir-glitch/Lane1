"use client";

import { useEffect, useId } from "react";
import { Kbd } from "@/components/ui/Misc";
import { cn } from "@/lib/cn";

/** `single` and SJT items: one option; keys 1–9. */
export function ChoiceItem({
  text,
  question,
  options,
  value,
  onAnswer,
}: {
  text: string;
  question?: string;
  options: string[];
  value: number | undefined;
  onAnswer: (index: number) => void;
}) {
  const id = useId();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) {
        e.preventDefault();
        onAnswer(n - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options.length, onAnswer]);

  return (
    <div>
      <p className={cn(question ? "text-body-l text-ink" : "text-h2 font-medium text-ink")}>{text}</p>
      {question ? (
        <h2 id={id} className="mt-6 text-h3 font-medium text-ink">
          {question}
        </h2>
      ) : (
        <span id={id} className="sr-only">
          {text}
        </span>
      )}
      <div role="radiogroup" aria-labelledby={id} className="mt-8 flex flex-col border-t border-rule">
        {options.map((o, i) => {
          const checked = value === i;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked || (value === undefined && i === 0) ? 0 : -1}
              onClick={() => onAnswer(i)}
              className={cn(
                "grid min-h-14 grid-cols-[32px_1fr_auto] items-center gap-4 border-b px-3 py-3 text-left transition-quiet",
                checked ? "border-ink bg-ink text-bg" : "border-rule text-ink hover:bg-surface",
              )}
            >
              <span className={cn("font-mono text-small", checked ? "text-bg" : "text-ink-3")}>{i + 1}</span>
              <span className="text-body">{o}</span>
              {i < 9 ? <Kbd className={cn("hidden sm:inline-flex", checked && "border-bg/40 text-bg")}>{i + 1}</Kbd> : <span />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
