"use client";

import { useEffect, useId } from "react";
import { Kbd } from "@/components/ui/Misc";
import type { LikertOption } from "@/lib/bank/types";
import { cn } from "@/lib/cn";

/** likert5 / likert7: keys 1–N answer and advance, ↑/↓ adjust, Enter confirms. Options may be unlabeled. */
export function LikertItem({
  text,
  options,
  value,
  onAnswer,
  onSkip,
  onPreview,
}: {
  text: string;
  options: LikertOption[];
  value: number | undefined;
  onAnswer: (v: number) => void;
  onSkip?: () => void;
  onPreview: (v: number) => void;
}) {
  const id = useId();
  const labeled = options.some((o) => o.label);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) {
        e.preventDefault();
        onAnswer(n);
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        onPreview(Math.min(options.length, (value ?? 0) + 1));
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        onPreview(Math.max(1, (value ?? 2) - 1));
      } else if (e.key === "Enter" && value !== undefined && (e.target as HTMLElement).tagName !== "BUTTON") {
        e.preventDefault();
        onAnswer(value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options.length, value, onAnswer, onPreview]);

  return (
    <div>
      <h2 id={id} className="text-h1 font-medium text-ink">
        {text}
      </h2>
      <div
        role="radiogroup"
        aria-labelledby={id}
        className={cn("mt-10 sm:mt-12", labeled ? "flex flex-col border-t border-rule" : "grid gap-1")}
        style={labeled ? undefined : { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={o.label || `${o.value} of ${options.length}`}
              tabIndex={checked || (value === undefined && o.value === 1) ? 0 : -1}
              onClick={() => onAnswer(o.value)}
              className={cn(
                "transition-quiet",
                labeled ? "grid h-14 grid-cols-[32px_1fr_auto] items-center gap-4 border-b px-3 text-left" : "flex h-14 items-center justify-center rounded-xs border font-mono",
                checked ? "border-ink bg-ink text-bg" : labeled ? "border-rule text-ink hover:bg-surface" : "border-rule bg-surface text-ink hover:border-rule-strong",
              )}
            >
              {labeled ? (
                <>
                  <span className={cn("font-mono text-small", checked ? "text-bg" : "text-ink-3")}>{o.value}</span>
                  <span className="text-body">{o.label}</span>
                  <Kbd className={cn("hidden sm:inline-flex", checked && "border-bg/40 text-bg")}>{o.value}</Kbd>
                </>
              ) : (
                o.value
              )}
            </button>
          );
        })}
      </div>
      {onSkip ? (
        <button type="button" onClick={onSkip} className="mt-4 label text-ink-3 transition-quiet hover:text-ink">
          Skip this one
        </button>
      ) : null}
    </div>
  );
}
