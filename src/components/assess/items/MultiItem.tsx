"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/cn";

/** `multi`: checkboxes; honours "select up to N" and exclusive options ("None"). */
export function MultiItem({
  text,
  options,
  max,
  exclusive = [],
  value,
  onAnswer,
}: {
  text: string;
  options: string[];
  max?: number;
  exclusive?: string[];
  value: number[] | undefined;
  onAnswer: (v: number[]) => void;
}) {
  const id = useId();
  const [sel, setSel] = useState<number[]>(value ?? []);
  const exclusiveIdx = options.map((o, i) => (exclusive.includes(o) ? i : -1)).filter((i) => i >= 0);

  function toggle(i: number, on: boolean) {
    setSel((prev) => {
      if (!on) return prev.filter((x) => x !== i);
      if (exclusiveIdx.includes(i)) return [i];
      const next = [...prev.filter((x) => !exclusiveIdx.includes(x)), i];
      return max && next.length > max ? prev : next;
    });
  }

  return (
    <fieldset aria-describedby={`${id}-hint`}>
      <legend className="text-h2 font-medium text-ink">{text}</legend>
      <p id={`${id}-hint`} className="mt-3 label text-ink-3">
        {max ? `Choose up to ${max} · ${sel.length} selected` : `Choose all that apply · ${sel.length} selected`}
      </p>
      <div className="mt-8 flex flex-col border-t border-rule">
        {options.map((o, i) => {
          const on = sel.includes(i);
          const disabled = !on && !!max && sel.length >= max && !exclusiveIdx.includes(i);
          return (
            <label
              key={o}
              className={cn(
                "flex min-h-14 cursor-pointer items-center gap-4 border-b border-rule px-3 py-3 text-body transition-quiet hover:bg-surface",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <Checkbox checked={on} disabled={disabled} onChange={(e) => toggle(i, e.currentTarget.checked)} />
              {o}
            </label>
          );
        })}
      </div>
      <Button className="mt-8" onClick={() => onAnswer(sel)} disabled={sel.length === 0}>
        Continue
      </Button>
    </fieldset>
  );
}
