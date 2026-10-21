"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Misc";
import { ProgressBar } from "./ProgressBar";
import { fmtTimer } from "@/lib/format";
import type { PatternCell, PatternItem } from "@/lib/types";
import { cn } from "@/lib/cn";

type Result = { itemId: string; choice: number | null; ms: number };
type Phase = "intro" | "answering" | "feedback" | "done";

const FEEDBACK_MS = 900;

/* ---------- drawing ---------- */

function Shape({ cell, cx, cy, s }: { cell: PatternCell; cx: number; cy: number; s: number }) {
  const cls = cell.filled ? "fill-ink stroke-ink" : "fill-none stroke-ink";
  const h = s / 2;
  switch (cell.shape) {
    case "circle":
      return <circle cx={cx} cy={cy} r={h} className={cls} strokeWidth={1.5} />;
    case "square":
      return <rect x={cx - h} y={cy - h} width={s} height={s} className={cls} strokeWidth={1.5} />;
    case "triangle":
      return <polygon points={`${cx},${cy - h} ${cx + h},${cy + h} ${cx - h},${cy + h}`} className={cls} strokeWidth={1.5} strokeLinejoin="round" />;
    case "diamond":
      return <polygon points={`${cx},${cy - h} ${cx + h},${cy} ${cx},${cy + h} ${cx - h},${cy}`} className={cls} strokeWidth={1.5} strokeLinejoin="round" />;
  }
}

function CellGlyph({ cell, size = 80 }: { cell: PatternCell; size?: number }) {
  const s = size * 0.17;
  const gap = size * 0.26;
  const start = size / 2 - ((cell.count - 1) * gap) / 2;
  return (
    <>
      {Array.from({ length: cell.count }, (_, i) => (
        <Shape key={i} cell={cell} cx={start + i * gap} cy={size / 2} s={s} />
      ))}
    </>
  );
}

function describe(cell: PatternCell) {
  return `${cell.count} ${cell.filled ? "filled" : "outlined"} ${cell.shape}${cell.count > 1 ? "s" : ""}`;
}

function Matrix({ item }: { item: PatternItem }) {
  const size = 80;
  return (
    <svg
      viewBox={`0 0 ${size * 3} ${size * 3}`}
      className="h-auto w-full max-w-[320px]"
      role="img"
      aria-label={`3 by 3 pattern. ${item.cells.map((c, i) => `Cell ${i + 1}: ${describe(c)}`).join(". ")}. Cell 9 is missing.`}
    >
      {Array.from({ length: 9 }, (_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const cell = item.cells[i];
        return (
          <g key={i} transform={`translate(${c * size} ${r * size})`}>
            <rect x={0.5} y={0.5} width={size - 1} height={size - 1} className={cell ? "fill-surface stroke-rule" : "fill-none stroke-ink-4"} strokeDasharray={cell ? undefined : "3 3"} />
            {cell ? (
              <CellGlyph cell={cell} size={size} />
            ) : (
              <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize={16} className="fill-ink-3">
                ?
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- game ---------- */

/**
 * Timed pattern-matrix task. Feedback is deliberately neutral ("Recorded"):
 * item-level right/wrong would teach the test and change what it measures.
 */
export function PatternGame({ items }: { items: PatternItem[] }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [remaining, setRemaining] = useState(items[0]?.seconds ?? 30);
  const startedAt = useRef(0);
  const item = items[index];
  const last = results[results.length - 1];

  const begin = useCallback(
    (i: number) => {
      const it = items[i];
      if (!it) return;
      setIndex(i);
      setRemaining(it.seconds);
      startedAt.current = performance.now();
      setPhase("answering");
    },
    [items],
  );

  const commit = useCallback(
    (choice: number | null) => {
      if (phase !== "answering" || !item) return;
      const ms = performance.now() - startedAt.current;
      setResults((r) => [...r, { itemId: item.id, choice, ms }]);
      setPhase("feedback");
    },
    [phase, item],
  );

  const advance = useCallback(() => {
    if (index + 1 >= items.length) setPhase("done");
    else begin(index + 1);
  }, [index, items.length, begin]);

  // Countdown.
  useEffect(() => {
    if (phase !== "answering" || !item) return;
    const id = window.setInterval(() => {
      const left = item.seconds - (performance.now() - startedAt.current) / 1000;
      setRemaining(left);
      if (left <= 0) commit(null);
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, item, commit]);

  // Auto-advance after neutral feedback.
  useEffect(() => {
    if (phase !== "feedback") return;
    const id = window.setTimeout(advance, FEEDBACK_MS);
    return () => window.clearTimeout(id);
  }, [phase, advance]);

  // Keyboard: 1–4 choose, Enter starts / continues.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (phase === "answering" && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        commit(Number(e.key) - 1);
      } else if (e.key === "Enter" && phase === "intro") {
        e.preventDefault();
        begin(0);
      } else if (e.key === "Enter" && phase === "feedback") {
        e.preventDefault();
        advance();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, commit, begin, advance]);

  const answered = results.length;
  const lowTime = phase === "answering" && remaining <= 10;

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="sticky top-[6.5rem] z-10 bg-bg lg:top-14">
        <ProgressBar value={answered} max={items.length} label={`Pattern matrices: ${answered} of ${items.length} recorded`} />
      </div>

      <div className="page flex-1 py-10 sm:py-16">
        <div className="mx-auto w-full max-w-[880px]">
          {phase === "intro" ? (
            <div className="max-w-reading">
              <p className="label text-ink-3">Cognitive games · 3 of 3</p>
              <h2 className="mt-6 text-h1 font-medium text-ink">Pattern matrices</h2>
              <p className="mt-4 text-body-l text-ink-2">
                Each grid follows a rule across its rows and columns. Choose the option that completes it. There are{" "}
                {items.length} items, each with its own time limit.
              </p>
              <ul className="mt-8 flex flex-col gap-3 border-t border-rule pt-6 text-small text-ink-2">
                <li className="flex items-center gap-3">
                  <Kbd>1</Kbd>–<Kbd>4</Kbd> choose an option, or click it.
                </li>
                <li>You will not be told whether an answer is right. That is deliberate: it keeps the measure clean.</li>
                <li>If time runs out, the item is recorded as unanswered and the game moves on.</li>
              </ul>
              <div className="mt-10 flex items-center gap-4">
                <Button onClick={() => begin(0)}>Start</Button>
                <span className="label text-ink-3">
                  or press <Kbd>↵</Kbd>
                </span>
              </div>
            </div>
          ) : phase === "done" ? (
            <div className="max-w-reading">
              <p className="label text-positive">Game recorded</p>
              <h2 className="mt-6 text-h1 font-medium text-ink">
                {results.filter((r) => r.choice !== null).length} of {items.length} answered in time.
              </h2>
              <p className="mt-4 text-body-l text-ink-2">
                Your pattern-reasoning estimate will update and its interval should narrow. Median response time:{" "}
                <span className="font-mono text-ink">
                  {(median(results.map((r) => r.ms)) / 1000).toFixed(1)} s
                </span>
                .
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <ButtonLink href="/assess">Back to assessment</ButtonLink>
                <ButtonLink href="/profile" variant="secondary">
                  View profile
                </ButtonLink>
              </div>
            </div>
          ) : item ? (
            <div>
              <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
                <p className="label text-ink-3">
                  Item {String(index + 1).padStart(2, "0")} / {items.length}
                </p>
                <p
                  className={cn("font-mono text-h3 tabular", lowTime ? "text-caution" : "text-ink")}
                  aria-label={`${Math.max(0, Math.ceil(remaining))} seconds left`}
                  role="timer"
                >
                  {fmtTimer(remaining)}
                </p>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={item.id}
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mt-8 grid gap-10 md:grid-cols-[1fr_1fr] md:items-center"
                >
                  <div className="flex justify-center md:justify-start">
                    <Matrix item={item} />
                  </div>
                  <div>
                    <p className="label text-ink-3">Which completes the pattern?</p>
                    <div role="group" aria-label="Options" className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
                      {item.options.map((opt, i) => {
                        const chosen = phase === "feedback" && last?.itemId === item.id && last.choice === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={phase !== "answering"}
                            onClick={() => commit(i)}
                            aria-label={`Option ${i + 1}: ${describe(opt)}`}
                            className={cn(
                              "flex flex-col items-center gap-2 rounded-xs border bg-surface p-1 pb-2 transition-quiet disabled:cursor-default",
                              chosen ? "border-ink" : "border-rule hover:border-rule-strong",
                            )}
                          >
                            <svg viewBox="0 0 80 80" className="aspect-square w-full" aria-hidden>
                              <CellGlyph cell={opt} />
                            </svg>
                            <Kbd>{i + 1}</Kbd>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-6 h-6 font-mono text-small text-ink-2" aria-live="polite">
                      {phase === "feedback" && last
                        ? last.choice === null
                          ? "Time's up. Recorded as unanswered."
                          : `Recorded · ${(last.ms / 1000).toFixed(1)} s`
                        : ""}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}
