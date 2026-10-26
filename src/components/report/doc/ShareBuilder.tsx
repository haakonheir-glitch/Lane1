"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { buttonClass } from "@/components/ui/Button";

/**
 * The share card, opt-in: a preview and a download. Only the first name, Holland code, top work
 * value and three closest career paths are included unless the person turns more on.
 */
export function ShareBuilder() {
  const [personality, setPersonality] = useState(false);
  const [reasoning, setReasoning] = useState(false);
  const q = `personality=${personality ? 1 : 0}&reasoning=${reasoning ? 1 : 0}`;
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <figure className="border border-paper-edge bg-paper p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/share?${q}`} alt="Preview of your share card" width={1200} height={630} className="h-auto w-full" />
        <figcaption className="mt-2 text-small text-ink-3">1200 × 630 PNG, made when you download it. Nothing is posted or stored.</figcaption>
      </figure>
      <div>
        <p className="text-body font-medium text-ink">Always on the card</p>
        <p className="mt-1 text-small text-ink-2">Your first name, Profile Mark, Holland code, top work value and three closest career paths.</p>
        <p className="mt-6 text-body font-medium text-ink">Add if you want to</p>
        <label className="mt-3 flex cursor-pointer items-start gap-3 text-small text-ink-2">
          <Checkbox checked={personality} onChange={(e) => setPersonality(e.currentTarget.checked)} className="mt-0.5" />
          <span>Standout personality trait, and the personality shape in the mark</span>
        </label>
        <label className="mt-3 flex cursor-pointer items-start gap-3 text-small text-ink-2">
          <Checkbox checked={reasoning} onChange={(e) => setReasoning(e.currentTarget.checked)} className="mt-0.5" />
          <span>Reasoning range, and the reasoning arc in the mark</span>
        </label>
        <a href={`/api/share?${q}&download=1`} download className={`${buttonClass({})} mt-8`}>
          Download PNG
        </a>
      </div>
    </div>
  );
}
