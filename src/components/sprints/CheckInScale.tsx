"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

/** 1–7 rating as square segmented buttons (radio group). Arrow keys and 1–7 select. */
export function CheckInScale({
  label,
  value,
  onChange,
  anchors = ["Low", "High"],
  disabled,
}: {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  anchors?: [string, string];
  disabled?: boolean;
}) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(n: number) {
    const v = Math.min(7, Math.max(1, n));
    onChange(v);
    refs.current[v - 1]?.focus();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (/^[1-7]$/.test(e.key)) {
      e.preventDefault();
      select(Number(e.key));
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      select((value ?? 0) + 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      select((value ?? 2) - 1);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span id={id} className="label text-ink-2">
          {label}
        </span>
        <span className="font-mono text-small text-ink">
          {value ?? "–"}
          <span className="text-label text-ink-3"> /7</span>
        </span>
      </div>
      <div role="radiogroup" aria-labelledby={id} className="grid grid-cols-7 gap-1" onKeyDown={onKeyDown}>
        {Array.from({ length: 7 }, (_, i) => {
          const n = i + 1;
          const checked = value === n;
          const filled = value !== null && n <= value;
          return (
            <button
              key={n}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`${n} of 7`}
              disabled={disabled}
              tabIndex={checked || (value === null && n === 1) ? 0 : -1}
              onClick={() => onChange(n)}
              className={cn(
                "flex aspect-square max-h-10 items-center justify-center rounded-xs border font-mono text-label transition-quiet",
                checked
                  ? "border-ink bg-ink text-bg"
                  : filled
                    ? "border-rule-strong bg-rule text-ink"
                    : "border-rule bg-surface text-ink-3 hover:border-rule-strong hover:text-ink",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between label text-ink-3">
        <span>{anchors[0]}</span>
        <span>{anchors[1]}</span>
      </div>
    </div>
  );
}
