"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Misc";
import type { PublicPolygon, PublicTrial } from "@/lib/bank/public";
import { useCountdown, useKeys, useOnce, useOnset } from "./hooks";
import { Timer } from "./Timer";
import type { Respond } from "./TaskRunner";
import { cn } from "@/lib/cn";

/** Draws a rotated polyomino (squares as corner polygons, centred on 0,0) in a fixed frame. */
function Shape({ poly, extent }: { poly: PublicPolygon; extent: number }) {
  const s = 40 / extent;
  return (
    <svg viewBox="-50 -50 100 100" className="aspect-square w-full" aria-hidden>
      {poly.map((sq, i) => (
        <polygon key={i} points={sq.map(([x, y]) => `${(x * s).toFixed(2)},${(y * s).toFixed(2)}`).join(" ")} className="fill-ink/15 stroke-ink" strokeWidth={1.25} strokeLinejoin="round" />
      ))}
    </svg>
  );
}

/** rotation2d: select the two options that are the target rotated (the other two are mirror images). */
export function RotationTask({ trial, respond }: { trial: Extract<PublicTrial, { task: "rotation2d" }>; respond: Respond }) {
  const [sel, setSel] = useState<number[]>([]);
  const rt = useOnset();
  const once = useOnce();
  const submit = (selected: number[]) => once(() => void respond({ kind: "multi", selected }, rt()));
  const left = useCountdown(trial.timeLimitSec, () => submit(sel));
  const toggle = (i: number) => setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : s.length < 2 ? [...s, i] : s));
  useKeys((k, e) => {
    const n = Number(k);
    if (n >= 1 && n <= 4) toggle(n - 1);
    if (k === "Enter" && sel.length === 2) {
      e.preventDefault();
      submit(sel);
    }
  });
  const extent = Math.max(...[trial.target, ...trial.options].flat(3).map((v) => Math.abs(v)), 1);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="label text-ink-3">Which two are the same shape, only turned?</p>
        <Timer left={left} limit={trial.timeLimitSec} />
      </div>
      <div className="mt-6 grid gap-8 md:grid-cols-[200px_1fr] md:items-center">
        <div>
          <p className="label text-ink-3">Target</p>
          <div className="mt-2 rounded-xs border border-rule-strong bg-surface p-2 text-ink">
            <Shape poly={trial.target} extent={extent} />
          </div>
        </div>
        <div role="group" aria-label="Options: select two" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {trial.options.map((o, i) => {
            const on = sel.includes(i);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={on}
                aria-label={`Option ${i + 1}`}
                onClick={() => toggle(i)}
                className={cn("flex flex-col items-center gap-1 rounded-xs border bg-surface p-2 text-ink transition-quiet", on ? "border-ink ring-1 ring-ink" : "border-rule hover:border-rule-strong")}
              >
                <Shape poly={o} extent={extent} />
                <Kbd>{i + 1}</Kbd>
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-6 flex items-center gap-4">
        <Button onClick={() => submit(sel)} disabled={sel.length !== 2}>
          Confirm ({sel.length}/2)
        </Button>
        <span className="label text-ink-3">
          or <Kbd>↵</Kbd>
        </span>
      </div>
    </div>
  );
}
