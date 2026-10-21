"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
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
        { value: "system", label: "Auto" },
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
    />
  );
}

/** Compact one-button toggle cycling light/dark, for tight spaces. */
export function ThemeCycle() {
  const pref = useThemePref();
  const next: ThemePref = pref === "dark" ? "light" : pref === "light" ? "system" : "dark";
  return (
    <button
      type="button"
      onClick={() => setThemePref(next)}
      className="label text-ink-3 transition-quiet hover:text-ink"
      aria-label={`Theme: ${pref}. Switch to ${next}.`}
    >
      Theme · {pref === "system" ? "Auto" : pref}
    </button>
  );
}
