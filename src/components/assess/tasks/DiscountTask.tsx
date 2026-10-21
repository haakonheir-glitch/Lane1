"use client";

import { Kbd } from "@/components/ui/Misc";
import type { PublicTrial } from "@/lib/bank/public";
import { useKeys, useOnce, useOnset } from "./hooks";
import type { Respond } from "./TaskRunner";

/** delay_discount: "X kr today" or "1,000 kr in N days". Adaptive; no right answer. */
export function DiscountTask({ trial, respond }: { trial: Extract<PublicTrial, { task: "delay_discount" }>; respond: Respond }) {
  const rt = useOnset();
  const once = useOnce();
  const pick = (option: "sooner" | "later") => once(() => void respond({ kind: "pick", option }, rt()));
  useKeys((k) => {
    if (k === "1" || k === "ArrowLeft") pick("sooner");
    if (k === "2" || k === "ArrowRight") pick("later");
  });
  const fmt = (n: number) => `${n.toLocaleString("en-US")} kr`;
  const days = trial.delayDays === 365 ? "1 year" : `${trial.delayDays} days`;
  return (
    <div className="max-w-reading">
      <p className="label text-ink-3">
        Choice {trial.choice} of {trial.choices} · which would you rather have?
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {[
          { key: "1", option: "sooner" as const, amount: trial.sooner, when: "today" },
          { key: "2", option: "later" as const, amount: trial.later, when: `in ${days}` },
        ].map((o) => (
          <button
            key={o.option}
            type="button"
            onClick={() => pick(o.option)}
            className="flex flex-col items-start gap-3 rounded-sm border border-rule bg-surface p-6 text-left transition-quiet hover:border-ink"
          >
            <span className="font-mono text-h2 text-ink">{fmt(o.amount)}</span>
            <span className="text-body text-ink-2">{o.when}</span>
            <Kbd>{o.key}</Kbd>
          </button>
        ))}
      </div>
    </div>
  );
}
