"use client";

import { useState, useTransition } from "react";
import { saveResonance } from "@/app/actions/resonance";
import { cn } from "@/lib/cn";

type Response = "yes" | "not_really" | "no";
const OPTIONS: { value: Response; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "not_really", label: "Not really" },
  { value: "no", label: "No" },
];

/**
 * "Does this resonate?" under one of the five top career path cards. The answer is stored with the
 * matching version that ranked it, to check the matching against; it never changes the results.
 */
export function Resonance({ laneId, rank, name, initial, className }: { laneId: string; rank: number; name: string; initial: Response | null; className?: string }) {
  const [value, setValue] = useState<Response | null>(initial);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, start] = useTransition();
  const pick = (v: Response) => {
    const before = value;
    setValue(v);
    start(async () => {
      const r = await saveResonance({ laneId, rank, response: v });
      if (r.ok) setStatus("saved");
      else {
        setValue(before);
        setStatus("error");
      }
    });
  };
  return (
    <fieldset className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 px-1", className)}>
      <legend className="sr-only">Does {name} resonate with you?</legend>
      <span aria-hidden className="text-small text-ink-3">
        Does this resonate?
      </span>
      <div className="flex gap-1.5">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex h-8 cursor-pointer items-center rounded-xs border px-3 text-small transition-quiet has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
              value === o.value ? "border-ink bg-ink text-bg" : "border-rule text-ink hover:bg-surface",
              pending && "opacity-70",
            )}
          >
            <input type="radio" name={`resonance-${laneId}`} value={o.value} checked={value === o.value} onChange={() => pick(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      <span role="status" className="label text-ink-3">
        {status === "saved" ? "Saved. It doesn't change your results." : status === "error" ? "Couldn't save. Try again." : ""}
      </span>
    </fieldset>
  );
}
