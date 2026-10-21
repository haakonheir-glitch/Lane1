"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Misc";
import { ProgressBar } from "./ProgressBar";
import { QuestionCard } from "./QuestionCard";
import { resetModule, saveAnswer } from "@/app/actions/assessment";
import { scaleAnchors, scalePrompt } from "@/lib/copy";
import type { LikertQuestion } from "@/lib/types";

const ADVANCE_DELAY = 180;

export function LikertRunner({
  moduleId,
  title,
  questions,
  initialAnswers,
}: {
  moduleId: string;
  title: string;
  questions: LikertQuestion[];
  initialAnswers: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const [answers, setAnswers] = useState(initialAnswers);
  const [saveError, setSaveError] = useState(false);
  const setAnswer = useCallback(
    (itemId: string, value: number) => {
      setAnswers((a) => ({ ...a, [itemId]: value }));
      saveAnswer({ moduleId, itemId, value })
        .then(() => setSaveError(false))
        .catch(() => setSaveError(true));
    },
    [moduleId],
  );
  const reset = useCallback(async () => {
    await resetModule(moduleId);
    setAnswers({});
  }, [moduleId]);
  const advanceTimer = useRef<number | null>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  const total = questions.length;
  const firstOpen = Math.max(1, questions.findIndex((q) => initialAnswers[q.id] === undefined) + 1 || questions.length);
  const qParam = Number(params.get("q") ?? String(firstOpen));
  const done = params.get("q") === "done";
  const index = done ? total : Math.min(total, Math.max(1, Number.isFinite(qParam) ? qParam : 1));
  const question = questions[index - 1];
  const answered = questions.filter((q) => answers[q.id] !== undefined).length;

  const go = useCallback(
    (q: number | "done") => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
      router.replace(`${pathname}?q=${q}`, { scroll: false });
    },
    [router, pathname],
  );

  const next = useCallback(() => {
    if (!question || answers[question.id] === undefined) return;
    go(index >= total ? "done" : index + 1);
  }, [question, answers, index, total, go]);

  const prev = useCallback(() => {
    if (done) go(total);
    else if (index > 1) go(index - 1);
  }, [done, index, total, go]);

  const select = useCallback(
    (value: number, advance: boolean) => {
      if (!question) return;
      setAnswer(question.id, value);
      if (advance) {
        if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
        advanceTimer.current = window.setTimeout(() => go(index >= total ? "done" : index + 1), ADVANCE_DELAY);
      }
    },
    [question, setAnswer, go, index, total],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (done) {
        if (e.key === "Backspace") {
          e.preventDefault();
          prev();
        }
        return;
      }
      if (!question) return;
      const current = answers[question.id];
      if (/^[1-5]$/.test(e.key)) {
        e.preventDefault();
        select(Number(e.key), true);
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        select(Math.min(5, (current ?? 0) + 1), false);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        select(Math.max(1, (current ?? 2) - 1), false);
      } else if (e.key === "Enter") {
        // Let Enter activate focused links/buttons other than the options.
        if (target && (target.tagName === "A" || (target.tagName === "BUTTON" && target.getAttribute("role") !== "radio"))) return;
        e.preventDefault();
        next();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, answers, select, next, prev, done]);

  useEffect(() => () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
  }, []);

  // Move focus to the new question for screen-reader users.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [index, done]);

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="sticky top-[6.5rem] z-10 bg-bg lg:top-14">
        <ProgressBar value={done ? total : answered} max={total} label={`${title}: ${answered} of ${total} answered`} />
      </div>

      <div className="page flex flex-1 flex-col py-10 sm:py-16">
        <div className="mx-auto w-full max-w-reading flex-1">
          <div ref={headingRef} tabIndex={-1} className="outline-none" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={done ? "done" : index}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
              >
                {done ? (
                  <div>
                    <p className="label text-positive">Module recorded</p>
                    <h2 className="mt-6 text-h1 font-medium text-ink">
                      {answered} of {total} answered.
                    </h2>
                    <p className="mt-4 text-body-l text-ink-2">
                      Your answers update the {title.toLowerCase()} section of your profile. Scores carry an interval because
                      answers shift a little between sittings; that is expected.
                    </p>
                    {answered < total ? (
                      <p className="mt-4 text-small text-caution">
                        {total - answered} unanswered. Unanswered items widen the interval but don&apos;t block your profile.
                      </p>
                    ) : null}
                    <div className="mt-10 flex flex-wrap gap-3">
                      <ButtonLink href="/assess">Back to assessment</ButtonLink>
                      <ButtonLink href="/profile" variant="secondary">
                        View profile
                      </ButtonLink>
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          await reset();
                          go(1);
                        }}
                      >
                        Start over
                      </Button>
                    </div>
                  </div>
                ) : question ? (
                  <QuestionCard
                    index={index}
                    total={total}
                    prompt={question.prompt}
                    instruction={scalePrompt[question.scale]}
                    anchors={scaleAnchors[question.scale]}
                    value={answers[question.id]}
                    onSelect={(v) => select(v, true)}
                  />
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {saveError ? (
          <p role="alert" className="mx-auto mt-8 w-full max-w-reading text-small text-caution">
            Your last answer didn&apos;t save. Check your connection, then go back and answer it again.
          </p>
        ) : null}

        {!done ? (
          <div className="mx-auto mt-12 flex w-full max-w-reading items-center justify-between gap-4 border-t border-rule pt-4">
            <Button variant="ghost" size="sm" onClick={prev} disabled={index <= 1}>
              <ArrowLeft aria-hidden strokeWidth={1.5} className="size-4" /> Back
            </Button>
            <p className="hidden items-center gap-2 label text-ink-3 md:flex">
              <Kbd>1</Kbd>–<Kbd>5</Kbd> answer <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> adjust <Kbd>↵</Kbd> next <Kbd>⌫</Kbd> back
            </p>
            <Button variant="secondary" size="sm" onClick={next} disabled={!question || answers[question.id] === undefined}>
              {index >= total ? "Finish" : "Next"} <ArrowRight aria-hidden strokeWidth={1.5} className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
