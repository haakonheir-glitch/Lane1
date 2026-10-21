"use client";

import { Kbd } from "@/components/ui/Misc";
import type { PublicTrial } from "@/lib/bank/public";
import { useKeys, useOnce, useOnset } from "./hooks";
import type { Respond } from "./TaskRunner";

/** learning_rate: map six new symbols onto keys 1–3. Feedback after every trial (the point of the task). */
export function LearningTask({ trial, respond }: { trial: Extract<PublicTrial, { task: "learning_rate" }>; respond: Respond }) {
  const rt = useOnset();
  const once = useOnce();
  const press = (key: number) => once(() => void respond({ kind: "key", key }, rt()));
  useKeys((k) => {
    const n = Number(k);
    if (n >= 1 && n <= trial.keys) press(n);
  });
  return (
    <div className="max-w-reading">
      <p className="label text-ink-3">
        Block {trial.block} of {trial.blocks} · trial {trial.trialInBlock} of {trial.trialsPerBlock}
      </p>
      <div className="mt-8 flex h-48 items-center justify-center rounded-sm border border-rule bg-surface">
        <span className="font-mono text-display text-ink" aria-label={`Symbol ${trial.symbol}`}>
          {trial.symbol}
        </span>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3" role="group" aria-label="Keys">
        {Array.from({ length: trial.keys }, (_, i) => (
          <button key={i} type="button" onClick={() => press(i + 1)} className="flex h-14 items-center justify-center gap-2 rounded-xs border border-rule bg-surface text-ink transition-quiet hover:border-rule-strong">
            <Kbd>{i + 1}</Kbd>
          </button>
        ))}
      </div>
    </div>
  );
}
