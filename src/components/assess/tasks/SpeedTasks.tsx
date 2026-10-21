"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Misc";
import { fmtTimer } from "@/lib/format";
import type { PublicTrial } from "@/lib/bank/public";
import { useKeys, useOnce } from "./hooks";
import type { Respond } from "./TaskRunner";
import { cn } from "@/lib/cn";

type Answer = { index: number; answer: number | null; rtMs: number };

/**
 * symbol_match: two triplets, same set or different? 90 s for the scored block (practice: one
 * pair per trial). Answers are batched and sent at the end; the server marks them.
 * Answer values: 1 = same, 0 = different.
 */
export function SymbolMatchTask({ trial, respond }: { trial: Extract<PublicTrial, { task: "symbol_match" }>; respond: Respond }) {
  const [started, setStarted] = useState(trial.durationSec === 0);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(trial.durationSec);
  const answers = useRef<Answer[]>([]);
  const shown = useRef(0);
  const once = useOnce();
  const finish = () => once(() => void respond({ kind: "batch", answers: answers.current }, 0));

  useEffect(() => {
    shown.current = performance.now();
  }, [i, started]);

  useEffect(() => {
    if (!started || !trial.durationSec) return;
    const t0 = performance.now();
    const id = window.setInterval(() => {
      const l = trial.durationSec - (performance.now() - t0) / 1000;
      setLeft(l);
      if (l <= 0) {
        window.clearInterval(id);
        finish();
      }
    }, 200);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const answer = (same: boolean) => {
    if (!started) return;
    answers.current.push({ index: i, answer: same ? 1 : 0, rtMs: performance.now() - shown.current });
    if (i + 1 >= trial.pairs.length) finish();
    else setI(i + 1);
  };
  useKeys((k, e) => {
    if (!started && (k === "Enter" || k === " ")) {
      e.preventDefault();
      setStarted(true);
    } else if (k === "f" || k === "F") answer(true);
    else if (k === "j" || k === "J") answer(false);
  });

  if (!started) {
    return (
      <div className="max-w-reading">
        <p className="text-body-l text-ink-2">90 seconds. As many as you can, as accurately as you can.</p>
        <Button className="mt-6" autoFocus onClick={() => setStarted(true)}>
          Go
        </Button>
      </div>
    );
  }
  const pair = trial.pairs[i]!;
  return (
    <div className="max-w-reading">
      <div className="flex items-baseline justify-between">
        <p className="label text-ink-3">Same three symbols?</p>
        {trial.durationSec ? <span className={cn("font-mono text-h3", left <= 10 ? "text-caution" : "text-ink")}>{fmtTimer(left)}</span> : <span className="label text-ink-3">Practice</span>}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-6 rounded-sm border border-rule bg-surface p-8 text-center">
        <span className="font-mono text-h1 tracking-[0.3em] text-ink" aria-label={`Left: ${pair.left.join(" ")}`}>
          {pair.left.join(" ")}
        </span>
        <span className="font-mono text-h1 tracking-[0.3em] text-ink" aria-label={`Right: ${pair.right.join(" ")}`}>
          {pair.right.join(" ")}
        </span>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="secondary" className="h-14" onClick={() => answer(true)}>
          Same <Kbd>F</Kbd>
        </Button>
        <Button variant="secondary" className="h-14" onClick={() => answer(false)}>
          Different <Kbd>J</Kbd>
        </Button>
      </div>
    </div>
  );
}

const RT_KEYS = ["d", "f", "j", "k"];

/** choice_rt: one of four squares lights up after a random foreperiod; respond as fast as possible. */
export function ChoiceRtTask({ trial, respond }: { trial: Extract<PublicTrial, { task: "choice_rt" }>; respond: Respond }) {
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [lit, setLit] = useState<number | null>(null);
  const onset = useRef(0);
  const answers = useRef<Answer[]>([]);
  const once = useOnce();

  useEffect(() => {
    if (!started) return;
    const t = trial.trials[i]!;
    const id = window.setTimeout(() => {
      onset.current = performance.now();
      setLit(t.stimulus);
    }, t.foreperiodMs);
    return () => window.clearTimeout(id);
  }, [started, i, trial.trials]);

  const press = (pos: number) => {
    if (!started || lit === null) return; // early presses are ignored
    answers.current.push({ index: i, answer: pos, rtMs: performance.now() - onset.current });
    setLit(null);
    if (i + 1 >= trial.trials.length) once(() => void respond({ kind: "batch", answers: answers.current }, 0));
    else setI(i + 1);
  };
  useKeys((k, e) => {
    if (!started && (k === "Enter" || k === " ")) {
      e.preventDefault();
      setStarted(true);
      return;
    }
    const pos = RT_KEYS.indexOf(k.toLowerCase());
    if (pos >= 0) press(pos);
  });

  return (
    <div className="max-w-reading">
      <p className="label text-ink-3">
        {started ? `Trial ${i + 1} of ${trial.trials.length}` : `${trial.trials.length} trial${trial.trials.length > 1 ? "s" : ""}`} · keep your fingers on D F J K
      </p>
      <div className="mt-8 grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((p) => (
          <button
            key={p}
            type="button"
            onPointerDown={() => press(p)}
            aria-label={`Position ${p + 1} (${RT_KEYS[p]!.toUpperCase()})`}
            className={cn("flex aspect-square items-end justify-center rounded-xs border pb-2 transition-colors duration-75", lit === p ? "border-accent bg-accent" : "border-rule-strong bg-surface")}
          >
            <Kbd className={lit === p ? "border-accent-ink/40 text-accent-ink" : ""}>{RT_KEYS[p]!.toUpperCase()}</Kbd>
          </button>
        ))}
      </div>
      {!started ? (
        <Button className="mt-8" autoFocus onClick={() => setStarted(true)}>
          Go
        </Button>
      ) : null}
    </div>
  );
}
