"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Kbd, Skeleton } from "@/components/ui/Misc";
import { ProgressBar } from "./ProgressBar";
import { LikertItem } from "./items/LikertItem";
import { ChoiceItem } from "./items/ChoiceItem";
import { MultiItem } from "./items/MultiItem";
import { TextItem } from "./items/TextItem";
import { SliderItem } from "./items/SliderItem";
import { QSortBoard } from "./items/QSortBoard";
import { IdeaList } from "./items/IdeaList";
import { EnvCheck } from "./items/EnvCheck";
import { TaskRunner } from "./tasks/TaskRunner";
import { api } from "./api";
import type { PublicStep } from "@/lib/bank/public";
import type { SessionId } from "@/lib/bank/types";
import { cn } from "@/lib/cn";

/**
 * Runs one session (S1–S5). The server decides what comes next; this component renders the
 * step, measures response time from paint to answer, and posts the answer. Position is kept
 * in the URL (?i=) so Back works and a reload resumes in place.
 */
export function SessionRunner({ sessionId, title }: { sessionId: SessionId; title: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const [step, setStep] = useState<PublicStep | null>(null);
  const [preview, setPreview] = useState<number | undefined>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const shownAt = useRef(0);
  const focusRef = useRef<HTMLDivElement>(null);
  const requested = params.get("i");

  const show = useCallback(
    (s: PublicStep) => {
      setStep(s);
      setPreview(s.kind === "item" && typeof s.value === "number" ? s.value : undefined);
      shownAt.current = performance.now();
      if (s.kind !== "done") router.replace(`${pathname}?i=${s.position}`, { scroll: false });
    },
    [router, pathname],
  );

  // Load the step for the URL position (or the first unanswered one).
  useEffect(() => {
    let cancelled = false;
    api
      .state(sessionId, requested !== null ? Number(requested) : undefined)
      .then((r) => !cancelled && show(r.step))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // Only on mount: later navigation goes through `show`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    // Wait for paint, then restart the response-time clock and move focus for screen readers.
    const id = requestAnimationFrame(() => {
      shownAt.current = performance.now();
      focusRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [step]);

  const answer = useCallback(
    async (value: unknown, skipped = false) => {
      if (!step || step.kind === "done" || step.kind === "task" || busy) return;
      const rt = performance.now() - shownAt.current;
      setBusy(true);
      setError("");
      try {
        const r = await api.answer(sessionId, step.position, value, rt, skipped);
        show(r.step);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [step, busy, sessionId, show],
  );

  const back = useCallback(async () => {
    if (!step || step.kind !== "item" || step.position === 0) return;
    try {
      const r = await api.state(sessionId, step.position - 1);
      show(r.step);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [step, sessionId, show]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "Backspace" && !["INPUT", "TEXTAREA"].includes(tag) && step?.kind === "item") {
        e.preventDefault();
        void back();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, back]);

  if (error && !step) {
    return (
      <div className="page py-16">
        <p role="alert" className="text-body text-caution">
          {error}
        </p>
        <ButtonLink href="/assess" variant="secondary" className="mt-6">
          Back to assessment
        </ButtonLink>
      </div>
    );
  }
  if (!step) return <Skeleton lines={4} className="page py-16" />;

  const progress = step.kind === "done" ? 1 : step.position / step.total;
  const isQuestionnaire = step.kind === "item" && ["likert5", "likert7"].includes(step.item.format.type);

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="sticky top-[6.5rem] z-10 bg-bg lg:top-14">
        <ProgressBar value={Math.round(progress * 1000)} max={1000} label={`${title}: ${Math.round(progress * 100)}% complete`} />
      </div>

      <div className="page flex flex-1 flex-col py-10 sm:py-14">
        <div className={cn("mx-auto w-full flex-1", step.kind === "task" ? "max-w-[880px]" : "max-w-reading")}>
          {step.kind !== "done" ? (
            <div className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
              <p className="label text-ink-3">
                {step.block.title} · part {step.block.index} of {step.block.count}
                {step.block.status === "experimental" ? <span className="ml-2 text-ink-3">· research questions</span> : null}
              </p>
              {step.kind === "item" ? (
                <p className="label text-ink-3">
                  {String(step.position + 1).padStart(3, "0")} / {step.total}
                </p>
              ) : null}
            </div>
          ) : null}

          <div ref={focusRef} tabIndex={-1} className="outline-none" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step.kind === "done" ? "done" : step.position}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
              >
                {step.kind === "item" && step.block.stem && step.item.format.type !== "forced_q_sort" ? <p className="mb-6 text-small text-ink-3">{step.block.stem}</p> : null}
                <StepView step={step} title={title} preview={preview} setPreview={setPreview} answer={answer} sessionId={sessionId} onTaskDone={show} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mx-auto mt-6 w-full max-w-reading text-small text-caution">
            {error}. Your earlier answers are saved; try again.
          </p>
        ) : null}

        {step.kind === "item" ? (
          <div className="mx-auto mt-12 flex w-full max-w-reading items-center justify-between gap-4 border-t border-rule pt-4">
            <Button variant="ghost" size="sm" onClick={back} disabled={step.position === 0 || busy}>
              <ArrowLeft aria-hidden strokeWidth={1.5} className="size-4" /> Back
            </Button>
            {isQuestionnaire ? (
              <p className="hidden items-center gap-2 label text-ink-3 md:flex">
                <Kbd>1</Kbd>–<Kbd>{step.item.format.type === "likert7" ? 7 : 5}</Kbd> answer <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> adjust <Kbd>↵</Kbd> confirm <Kbd>⌫</Kbd> back
              </p>
            ) : (
              <span />
            )}
            <span className="label text-ink-3">{busy ? "Saving…" : "Saved"}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StepView({
  step,
  title,
  preview,
  setPreview,
  answer,
  sessionId,
  onTaskDone,
}: {
  step: PublicStep;
  title: string;
  preview: number | undefined;
  setPreview: (v: number) => void;
  answer: (v: unknown, skipped?: boolean) => void;
  sessionId: SessionId;
  onTaskDone: (s: PublicStep) => void;
}) {
  if (step.kind === "done") return <SessionOutro step={step} title={title} sessionId={sessionId} />;
  if (step.kind === "env_check") return <EnvCheck questions={step.questions} onAnswer={(v) => answer(v)} />;
  if (step.kind === "task") return <TaskRunner sessionId={sessionId} task={step.task} onDone={onTaskDone} />;
  const f = step.item.format;
  const text = step.item.text;
  switch (f.type) {
    case "likert5":
    case "likert7":
      return <LikertItem text={text} options={f.options} value={preview} onPreview={setPreview} onAnswer={(v) => answer(v)} onSkip={() => answer(null, true)} />;
    case "single":
      return <ChoiceItem text={text} options={f.options} value={typeof step.value === "number" ? step.value : undefined} onAnswer={(v) => answer(v)} />;
    case "sjt":
      return <ChoiceItem text={text} question={f.question} options={f.options} value={typeof step.value === "number" ? step.value : undefined} onAnswer={(v) => answer(v)} />;
    case "multi":
      return <MultiItem text={text} options={f.options} max={f.max} exclusive={f.exclusive} value={Array.isArray(step.value) ? (step.value as number[]) : undefined} onAnswer={(v) => answer(v)} />;
    case "text":
    case "number":
      return <TextItem text={text} kind={f.type} unit={f.type === "number" ? f.unit : undefined} value={step.value as string | number | undefined} onAnswer={(v) => answer(v)} onSkip={() => answer(null, true)} />;
    case "slider_0_100":
      return <SliderItem text={text} value={typeof step.value === "number" ? step.value : undefined} onAnswer={(v) => answer(v)} />;
    case "forced_q_sort":
      return <QSortBoard stem={step.block.stem ?? text} cards={f.cards} columns={f.columns} capacities={f.capacities} onAnswer={(v) => answer(v)} />;
    case "ideas":
      return <IdeaList prompt={text} instructions={f.instructions} seconds={f.seconds} onAnswer={(v) => answer(v)} />;
    default:
      return null;
  }
}

function SessionOutro({ step, title, sessionId }: { step: Extract<PublicStep, { kind: "done" }>; title: string; sessionId: SessionId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function retake() {
    setBusy(true);
    await api.retake(sessionId);
    router.replace(`/assess/${sessionId}`);
    router.refresh();
    window.location.reload();
  }
  if (step.status === "discarded") {
    return (
      <div>
        <p className="label text-caution">Not used</p>
        <h2 className="mt-6 text-h1 font-medium text-ink">Thanks for being honest. We won&apos;t use this session.</h2>
        <p className="mt-4 text-body-l text-ink-2">Take it again when you have the time and attention. Nothing counts against you.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button onClick={retake} disabled={busy}>
            Retake now
          </Button>
          <ButtonLink href="/assess" variant="secondary">
            Later
          </ButtonLink>
        </div>
      </div>
    );
  }
  return (
    <div>
      <p className="label text-positive">Session recorded</p>
      <h2 className="mt-6 text-h1 font-medium text-ink">{title} is done.</h2>
      <p className="mt-4 text-body-l text-ink-2">
        <span className="text-ink">Unlocks:</span> {step.unlocks}
      </p>
      {step.confidence === "low" ? (
        <div className="mt-6 rounded-sm border border-caution/50 bg-surface p-4">
          <p className="label text-caution">Low confidence</p>
          <p className="mt-2 text-small text-ink-2">
            A few signs suggest some answers were rushed: {step.flags.join("; ")}. That happens. Your answers are kept, and you can retake the
            session for a cleaner result.
          </p>
        </div>
      ) : null}
      {step.effort === "offer_redo" ? <p className="mt-4 text-small text-ink-2">You said you rushed some parts. You can retake this session whenever you like.</p> : null}
      {step.hasExperimental ? (
        <p className="mt-4 text-small text-ink-3">Some questions in this session were research questions. They are collected for Lane&apos;s pilot and not part of your results until validated.</p>
      ) : null}
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/assess">Back to assessment</ButtonLink>
        {step.confidence === "low" || step.effort === "offer_redo" ? (
          <Button variant="secondary" onClick={retake} disabled={busy}>
            Retake session
          </Button>
        ) : null}
      </div>
    </div>
  );
}
