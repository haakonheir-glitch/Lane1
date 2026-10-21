"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Misc";
import type { PublicTrial } from "@/lib/bank/public";
import { useKeys } from "./hooks";
import type { Respond } from "./TaskRunner";
import { cn } from "@/lib/cn";

/**
 * balloon (BART): each pump earns a point for this balloon; collect to bank them. The server
 * holds the burst points and answers each pump, so they can't be read from the page.
 */
export function BalloonTask({ trial, respond }: { trial: Extract<PublicTrial, { task: "balloon" }>; respond: Respond }) {
  const [pumps, setPumps] = useState(0);
  const [state, setState] = useState<"live" | "burst" | "banked">("live");
  const [busy, setBusy] = useState(false);

  async function pump() {
    if (busy || state !== "live") return;
    setBusy(true);
    const r = await respond({ kind: "pump", pumps: pumps + 1 }, 0);
    setBusy(false);
    if (!r?.balloon) return;
    setPumps(r.balloon.pumps);
    if (r.balloon.burst) setState("burst");
  }
  async function collect() {
    if (busy || state !== "live") return;
    setBusy(true);
    setState("banked");
    await respond({ kind: "collect", pumps }, 0);
  }
  useKeys((k, e) => {
    if (k === " ") {
      e.preventDefault();
      void pump();
    } else if (k === "Enter") {
      e.preventDefault();
      void collect();
    }
  });

  const size = 40 + Math.min(pumps, trial.maxPumps) * 2.4;
  return (
    <div className="max-w-reading">
      <div className="flex items-baseline justify-between">
        <p className="label text-ink-3">
          Balloon {trial.balloon} of {trial.balloons}
        </p>
        <p className="font-mono text-small text-ink">
          Banked {trial.total} <span className="text-label text-ink-3">pts</span>
        </p>
      </div>
      <div className="mt-6 flex h-72 items-center justify-center rounded-sm border border-rule bg-surface" aria-live="polite">
        {state === "burst" ? (
          <p className="label text-caution">Burst · {pumps} points lost</p>
        ) : state === "banked" ? (
          <p className="label text-positive">Banked {pumps} points</p>
        ) : (
          <svg viewBox="0 0 240 240" className="h-full" aria-label={`Balloon with ${pumps} pumps`}>
            <circle cx="120" cy="120" r={size / 2} className="fill-accent/10 stroke-accent" strokeWidth={1.25} />
          </svg>
        )}
      </div>
      <p className="mt-3 font-mono text-small text-ink">
        This balloon: {pumps} <span className="text-label text-ink-3">pts</span>
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="secondary" className={cn("h-14")} onClick={pump} disabled={busy || state !== "live"}>
          Pump <Kbd>Space</Kbd>
        </Button>
        <Button className="h-14" onClick={collect} disabled={busy || state !== "live" || pumps === 0}>
          Collect <Kbd className="border-accent-ink/40 text-accent-ink">↵</Kbd>
        </Button>
      </div>
    </div>
  );
}
