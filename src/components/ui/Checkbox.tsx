"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** 16px square checkbox. Native input for accessibility, drawn with tokens. */
export function Checkbox({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <span className={cn("relative inline-flex size-4 shrink-0", className)}>
      <input
        type="checkbox"
        className="peer size-4 appearance-none rounded-xs border border-rule-strong bg-surface transition-quiet checked:border-ink checked:bg-ink"
        {...props}
      />
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute inset-0 size-4 text-bg opacity-0 peer-checked:opacity-100"
      >
        <path d="M4 8.5l2.5 2.5L12 5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </span>
  );
}
