"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { PublicTrial } from "@/lib/bank/public";
import { useKeys, useOnce } from "./hooks";
import type { Respond } from "./TaskRunner";
import { cn } from "@/lib/cn";

/**
 * backward_digits: digits one at a time (presentationMs, isiMs), then type them in reverse.
 * corsi: blocks light up in sequence, then tap them in the same order.
 * The sequence is the stimulus itself, so it is sent to the client; marking is on the server.
 */
export function SpanTask({ trial, respond }: { trial: Extract<PublicTrial, { task: "backward_digits" | "corsi" }>; respond: Respond }) {
  const [phase, setPhase] = useState<"ready" | "show" | "input">("ready");
  const [lit, setLit] = useState<number | null>(null);
  const [input, setInput] = useState<number[]>([]);
  const [inputStart, setInputStart] = useState(0);
  const once = useOnce();
  const n = trial.sequence.length;
  const corsi = trial.task === "corsi";

  useEffect(() => {
    if (phase !== "show") return;
    let cancelled = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 500));
      for (const v of trial.sequence) {
        if (cancelled) return;
        setLit(v);
        await new Promise((r) => setTimeout(r, trial.presentationMs));
        setLit(null);
        await new Promise((r) => setTimeout(r, trial.isiMs));
      }
      if (!cancelled) {
        setPhase("input");
        setInputStart(performance.now());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, trial]);

  const submit = (seq: number[]) => once(() => void respond({ kind: "sequence", sequence: seq }, performance.now() - inputStart));
  const add = (v: number) => {
    if (phase !== "input") return;
    setInput((s) => {
      if (s.length >= n) return s;
      const next = [...s, v];
      if (corsi && next.length === n) submit(next);
      return next;
    });
  };

  useKeys((k, e) => {
    if (phase === "ready" && (k === "Enter" || k === " ")) {
      e.preventDefault();
      setPhase("show");
    } else if (phase === "input" && !corsi) {
      if (/^[0-9]$/.test(k)) add(Number(k));
      else if (k === "Backspace") setInput((s) => s.slice(0, -1));
      else if (k === "Enter" && input.length === n) submit(input);
    }
  });

  return (
    <div className="max-w-reading">
      <p className="label text-ink-3">
        {corsi ? `${n} blocks` : `${n} digits`} · {phase === "ready" ? "ready when you are" : phase === "show" ? "watch" : corsi ? "tap them in the same order" : "type them in reverse order"}
      </p>

      {corsi ? (
        <div className="relative mt-6 aspect-square w-full max-w-[420px] rounded-sm border border-rule bg-surface">
          {(trial.layout ?? []).map(([x, y], i) => (
            <button
              key={i}
              type="button"
              disabled={phase !== "input"}
              onClick={() => add(i)}
              aria-label={`Block ${i + 1}`}
              className={cn(
                "absolute size-[14%] -translate-x-1/2 -translate-y-1/2 rounded-xs border transition-colors duration-100",
                lit === i ? "border-accent bg-accent" : input.includes(i) && phase === "input" ? "border-ink bg-ink/20" : "border-rule-strong bg-bg",
                phase === "input" && "hover:border-ink",
              )}
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex h-40 items-center justify-center rounded-sm border border-rule bg-surface">
          {phase === "show" ? (
            <span className="font-mono text-display text-ink" aria-live="off">
              {lit ?? ""}
            </span>
          ) : phase === "input" ? (
            <span className="font-mono text-h1 tracking-[0.3em] text-ink" aria-live="polite">
              {input.join("") || <span className="text-ink-4">{"·".repeat(n)}</span>}
            </span>
          ) : (
            <span className="label text-ink-3">Digits appear here</span>
          )}
        </div>
      )}

      {phase === "ready" ? (
        <Button className="mt-6" onClick={() => setPhase("show")} autoFocus>
          Show {corsi ? "blocks" : "digits"}
        </Button>
      ) : null}

      {phase === "input" && !corsi ? (
        <div className="mt-6">
          <div className="grid max-w-[320px] grid-cols-5 gap-2" role="group" aria-label="Digit keypad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => (
              <button key={d} type="button" onClick={() => add(d)} className="h-12 rounded-xs border border-rule bg-surface font-mono text-body text-ink transition-quiet hover:border-rule-strong">
                {d}
              </button>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={() => submit(input)} disabled={input.length !== n}>
              Submit
            </Button>
            <Button variant="ghost" onClick={() => setInput((s) => s.slice(0, -1))} disabled={input.length === 0}>
              Delete
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
