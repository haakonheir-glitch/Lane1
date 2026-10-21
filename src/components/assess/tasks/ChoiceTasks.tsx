"use client";

import { Kbd } from "@/components/ui/Misc";
import type { PublicTrial } from "@/lib/bank/public";
import { useCountdown, useKeys, useOnce, useOnset } from "./hooks";
import { Timer } from "./Timer";
import type { Respond } from "./TaskRunner";
import { cn } from "@/lib/cn";

function OptionGrid({ options, onPick, mono = true, cols }: { options: (string | number)[]; onPick: (i: number) => void; mono?: boolean; cols: string }) {
  return (
    <div role="group" aria-label="Options" className={cn("mt-8 grid gap-2", cols)}>
      {options.map((o, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(i)}
          aria-label={`Option ${i + 1}: ${o}`}
          className="flex h-20 flex-col items-center justify-center gap-2 rounded-xs border border-rule bg-surface transition-quiet hover:border-rule-strong"
        >
          <span className={cn("text-h3 text-ink", mono && "font-mono")}>{o}</span>
          <Kbd>{i + 1}</Kbd>
        </button>
      ))}
    </div>
  );
}

/** number_series / letter_series: five shown terms, five options. */
export function SeriesTask({ trial, respond }: { trial: Extract<PublicTrial, { task: "number_series" | "letter_series" }>; respond: Respond }) {
  const rt = useOnset();
  const once = useOnce();
  const pick = (choice: number | null) => once(() => void respond({ kind: "choice", choice }, rt()));
  const left = useCountdown(trial.timeLimitSec, () => pick(null));
  useKeys((k) => {
    const n = Number(k);
    if (n >= 1 && n <= trial.options.length) pick(n - 1);
  });
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="label text-ink-3">What comes next?</p>
        <Timer left={left} limit={trial.timeLimitSec} />
      </div>
      <p className="mt-8 flex flex-wrap items-baseline gap-x-6 gap-y-2 font-mono text-h1 text-ink" aria-label={`Series: ${trial.shown.join(", ")}, then what?`}>
        {trial.shown.map((x, i) => (
          <span key={i}>{x}</span>
        ))}
        <span className="text-ink-3">?</span>
      </p>
      <OptionGrid options={trial.options} onPick={pick} cols="grid-cols-5" />
    </div>
  );
}

/** quant: short word problem, four options, no calculator. */
export function QuantTask({ trial, respond }: { trial: Extract<PublicTrial, { task: "quant" }>; respond: Respond }) {
  const rt = useOnset();
  const once = useOnce();
  const pick = (choice: number | null) => once(() => void respond({ kind: "choice", choice }, rt()));
  const left = useCountdown(trial.timeLimitSec, () => pick(null));
  useKeys((k) => {
    const n = Number(k);
    if (n >= 1 && n <= trial.options.length) pick(n - 1);
  });
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="label text-ink-3">No calculator</p>
        <Timer left={left} limit={trial.timeLimitSec} />
      </div>
      <p className="mt-8 text-body-l text-ink">{trial.text}</p>
      <OptionGrid options={trial.options.map((o) => o.toLocaleString("en-US"))} onPick={pick} cols="grid-cols-2 sm:grid-cols-4" />
    </div>
  );
}
