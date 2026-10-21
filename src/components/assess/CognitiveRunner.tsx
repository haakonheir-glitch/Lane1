"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Misc";
import { ProgressBar } from "./ProgressBar";
import { CellGlyph, Matrix, describe } from "./PatternDrawing";
import { submitGameAnswer } from "@/app/actions/assessment";
import { fmtTimer } from "@/lib/format";
import type { PublicGameItem } from "@/lib/assessment/items";
import { cn } from "@/lib/cn";

export type GameState = { id: string; title: string; instruction: string; aptitude: string; total: number; items: PublicGameItem[] };

type Phase = "intro" | "answering" | "feedback" | "done";
type Last = { itemId: string; choice: number | null; ms: number };

const FEEDBACK_MS = 900;

/**
 * Runs the cognitive games in order, resuming wherever the person left off.
 * Feedback is deliberately neutral ("Recorded"): item-level right/wrong would teach
 * the test and change what it measures. Marking happens on the server.
 */
export function CognitiveRunner({ games: initialGames }: { games: GameState[] }) {
  const reduce = useReducedMotion();
  // Snapshot on mount: each saved answer revalidates the page, which would otherwise
  // shrink the remaining-items lists underneath the running game.
  const [games] = useState(initialGames);
  const [queue] = useState(() => initialGames.filter((g) => g.items.length > 0));
  const [gameIndex, setGameIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(queue.length ? "intro" : "done");
  const [remaining, setRemaining] = useState(0);
  const [last, setLast] = useState<Last | null>(null);
  const [recorded, setRecorded] = useState(0);
  const [error, setError] = useState("");
  const startedAt = useRef(0);

  const game = queue[gameIndex];
  const item = game?.items[index];
  const position = game ? game.total - game.items.length + index + 1 : 0;

  const begin = useCallback(
    (i: number) => {
      const it = game?.items[i];
      if (!it) return;
      setIndex(i);
      setRemaining(it.seconds);
      startedAt.current = performance.now();
      setPhase("answering");
    },
    [game],
  );

  const commit = useCallback(
    (choice: number | null) => {
      if (phase !== "answering" || !item) return;
      const ms = Math.round(performance.now() - startedAt.current);
      setLast({ itemId: item.id, choice, ms });
      setPhase("feedback");
      submitGameAnswer({ itemId: item.id, choice, ms })
        .then(() => {
          setRecorded((n) => n + 1);
          setError("");
        })
        .catch(() => setError("That answer didn't save. Check your connection; you can resume this game later."));
    },
    [phase, item],
  );

  const advance = useCallback(() => {
    if (!game) return;
    if (index + 1 < game.items.length) return begin(index + 1);
    if (gameIndex + 1 < queue.length) {
      setGameIndex(gameIndex + 1);
      setIndex(0);
      setPhase("intro");
    } else setPhase("done");
  }, [game, index, gameIndex, queue.length, begin]);

  useEffect(() => {
    if (phase !== "answering" || !item) return;
    const id = window.setInterval(() => {
      const left = item.seconds - (performance.now() - startedAt.current) / 1000;
      setRemaining(left);
      if (left <= 0) commit(null);
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, item, commit]);

  useEffect(() => {
    if (phase !== "feedback") return;
    const id = window.setTimeout(advance, FEEDBACK_MS);
    return () => window.clearTimeout(id);
  }, [phase, advance]);

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

  const totalItems = games.reduce((n, g) => n + g.total, 0);
  const doneBefore = games.reduce((n, g) => n + g.total - g.items.length, 0);
  const lowTime = phase === "answering" && remaining <= 10;

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="sticky top-[6.5rem] z-10 bg-bg lg:top-14">
        <ProgressBar value={doneBefore + recorded} max={totalItems} label={`Cognitive games: ${doneBefore + recorded} of ${totalItems} items recorded`} />
      </div>

      <div className="page flex-1 py-10 sm:py-16">
        <div className="mx-auto w-full max-w-[880px]">
          {phase === "done" || !game ? (
            <div className="max-w-reading">
              <p className="label text-positive">Games recorded</p>
              <h2 className="mt-6 text-h1 font-medium text-ink">All three games are done.</h2>
              <p className="mt-4 text-body-l text-ink-2">
                Your reasoning scores are on your profile. Each game is short, so its interval is wide; treat the scores
                as rough.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <ButtonLink href="/profile">View profile</ButtonLink>
                <ButtonLink href="/assess" variant="secondary">
                  Back to assessment
                </ButtonLink>
              </div>
            </div>
          ) : phase === "intro" ? (
            <div className="max-w-reading">
              <p className="label text-ink-3">
                Cognitive games · {games.findIndex((g) => g.id === game.id) + 1} of {games.length}
              </p>
              <h2 className="mt-6 text-h1 font-medium text-ink">{game.title}</h2>
              <p className="mt-4 text-body-l text-ink-2">
                {game.instruction} {game.items.length < game.total ? `${game.items.length} items left.` : `${game.total} items, each with its own time limit.`}
              </p>
              <ul className="mt-8 flex flex-col gap-3 border-t border-rule pt-6 text-small text-ink-2">
                <li className="flex items-center gap-3">
                  <Kbd>1</Kbd>–<Kbd>4</Kbd> choose an option, or click it.
                </li>
                <li>You won&apos;t be told whether an answer is right. That is deliberate: it keeps the measure clean.</li>
                <li>Each item can be answered once. If time runs out, it is recorded as unanswered.</li>
              </ul>
              <div className="mt-10 flex items-center gap-4">
                <Button onClick={() => begin(0)}>Start</Button>
                <span className="label text-ink-3">
                  or press <Kbd>↵</Kbd>
                </span>
              </div>
            </div>
          ) : item ? (
            <div>
              <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
                <p className="label text-ink-3">
                  {game.title} · Item {String(position).padStart(2, "0")} / {game.total}
                </p>
                <p className={cn("font-mono text-h3 tabular", lowTime ? "text-caution" : "text-ink")} aria-label={`${Math.max(0, Math.ceil(remaining))} seconds left`} role="timer">
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
                  className={cn("mt-8 grid gap-10", item.kind === "pattern" && "md:grid-cols-2 md:items-center")}
                >
                  {item.kind === "pattern" ? (
                    <div className="flex justify-center md:justify-start">
                      <Matrix item={item} />
                    </div>
                  ) : (
                    <p className="text-h2 font-medium text-ink">{item.prompt}</p>
                  )}
                  <div>
                    <p className="label text-ink-3">{item.kind === "pattern" ? "Which completes the pattern?" : "Choose one"}</p>
                    <div role="group" aria-label="Options" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                      {item.options.map((opt, i) => {
                        const chosen = phase === "feedback" && last?.itemId === item.id && last.choice === i;
                        const label = typeof opt === "string" ? opt : describe(opt);
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={phase !== "answering"}
                            onClick={() => commit(i)}
                            aria-label={`Option ${i + 1}: ${label}`}
                            className={cn(
                              "flex flex-col items-center gap-2 rounded-xs border bg-surface p-1 pb-2 transition-quiet disabled:cursor-default",
                              chosen ? "border-ink" : "border-rule hover:border-rule-strong",
                            )}
                          >
                            {typeof opt === "string" ? (
                              <span className={cn("flex h-16 items-center px-2 text-center text-body text-ink", /^[0-9]/.test(opt) && "font-mono")}>{opt}</span>
                            ) : (
                              <svg viewBox="0 0 80 80" className="aspect-square w-full" aria-hidden>
                                <CellGlyph cell={opt} />
                              </svg>
                            )}
                            <Kbd>{i + 1}</Kbd>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-6 min-h-6 font-mono text-small text-ink-2" aria-live="polite">
                      {phase === "feedback" && last
                        ? last.choice === null
                          ? "Time's up. Recorded as unanswered."
                          : `Recorded · ${(last.ms / 1000).toFixed(1)} s`
                        : ""}
                    </p>
                    {error ? (
                      <p role="alert" className="mt-2 text-small text-caution">
                        {error}
                      </p>
                    ) : null}
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
