"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import { setThemePref, useThemePref, type ThemePref } from "./theme";

export function ThemeToggle({ className }: { className?: string }) {
  const pref = useThemePref();
  return (
    <SegmentedControl<ThemePref>
      label="Theme"
      value={pref}
      onChange={setThemePref}
      className={className}
      options={[
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
    />
  );
}

/** Compact one-button toggle between light and dark, for tight spaces. */
export function ThemeCycle() {
  const pref = useThemePref();
  const next: ThemePref = pref === "dark" ? "light" : "dark";
  return (
    <button type="button" onClick={() => setThemePref(next)} className="label text-ink-3 transition-quiet hover:text-ink" aria-label={`Theme: ${pref}. Switch to ${next}.`}>
      Theme · {pref}
    </button>
  );
}

/** The headers' 44×44 icon button: a moon in light mode (switch to dark), a sun in dark mode. */
export function ThemeIconButton({ className }: { className?: string }) {
  const pref = useThemePref();
  const next: ThemePref = pref === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setThemePref(next)}
      aria-label={next === "dark" ? "Switch to dark mode" : "Switch to light mode"}
      className={cn("inline-flex size-11 items-center justify-center rounded-xs text-ink-2 transition-quiet hover:bg-surface hover:text-ink", className)}
    >
      {pref === "dark" ? (
        <svg aria-hidden viewBox="0 0 20 20" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
          <circle cx="10" cy="10" r="3.5" />
          <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6 16 16M4 16l1.4-1.4M14.6 5.4 16 4" />
        </svg>
      ) : (
        <svg aria-hidden viewBox="0 0 20 20" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
          <path d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z" />
        </svg>
      )}
    </button>
  );
}
