"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Misc";
import { api } from "../api";
import type { PublicStep, PublicTrial, TaskResponse, TaskTurn } from "@/lib/bank/public";
import type { CognitiveTaskId, SessionId } from "@/lib/bank/types";
import { MatrixTask } from "./MatrixTask";
import { SeriesTask, QuantTask } from "./ChoiceTasks";
import { RotationTask } from "./RotationTask";
import { SpanTask } from "./SpanTask";
import { SymbolMatchTask, ChoiceRtTask } from "./SpeedTasks";
import { LearningTask } from "./LearningTask";
import { BalloonTask } from "./BalloonTask";
import { DiscountTask } from "./DiscountTask";
import { cn } from "@/lib/cn";

type Trial = NonNullable<TaskTurn["trial"]>;
export type Respond = (response: TaskResponse, rtMs: number) => Promise<TaskTurn | null>;

/** How to answer, per task (UI copy; the task itself is described by the package's `format`). */
const HOW: Record<CognitiveTaskId, string> = {
  matrix: "Keys 1–8 or click an option.",
  number_series: "Keys 1–5 or click an option.",
  letter_series: "Keys 1–5 or click an option.",
  quant: "Keys 1–4 or click an option. Work it out in your head or on paper.",
  rotation2d: "Select two options (keys 1–4), then press Enter or Confirm.",
  backward_digits: "Watch the digits, then type them in reverse order and press Enter.",
  corsi: "Watch the blocks light up, then tap them in the same order.",
  symbol_match: "F = same set, J = different, or use the buttons. Be fast and accurate: wrong answers count against you.",
  choice_rt: "Press D, F, J or K (or tap) for the square that lights up, as fast as you can.",
  learning_rate: "Press 1, 2 or 3 for each symbol. You'll be told if you were right, so you can learn the pattern.",
  balloon: "Space to pump, Enter to collect your points. If the balloon bursts, its points are lost.",
  delay_discount: "Key 1 or 2, or click the option you'd choose. There is no right answer.",
};

export function TaskRunner({
  sessionId,
  task,
  onDone,
}: {
  sessionId: SessionId;
  task: { id: CognitiveTaskId; title: string; instructions: string; practice: number; minutes: number };
  onDone: (next: PublicStep) => void;
}) {
  const [phase, setPhase] = useState<"intro" | "running" | "practice-done">("intro");
  const [trial, setTrial] = useState<Trial | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean } | null>(null);
  const [error, setError] = useState("");

  const advance = useCallback(
    (r: TaskTurn & { next?: PublicStep }) => {
      if (!r.trial) {
        if (r.next) onDone(r.next);
        return;
      }
      setTrial((prev) => {
        if (prev?.practice && !r.trial!.practice) setPhase("practice-done");
        return r.trial;
      });
    },
    [onDone],
  );

  const start = useCallback(async () => {
    try {
      setError("");
      const r = await api.task(sessionId, task.id, { kind: "start" });
      setPhase("running");
      advance(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [sessionId, task.id, advance]);

  const respond: Respond = useCallback(
    async (response, rtMs) => {
      if (!trial) return null;
      try {
        const r = await api.task(sessionId, task.id, { kind: "respond", index: trial.index, practice: trial.practice, response, rtMs });
        // Feedback: practice items (and every learning trial) show it briefly before moving on.
        if (r.feedback && (trial.practice || task.id === "learning_rate")) {
          setFeedback(r.feedback);
          await new Promise((res) => setTimeout(res, task.id === "learning_rate" ? 450 : 1100));
          setFeedback(null);
        }
        if (task.id === "balloon" && r.balloon && r.trial?.index === trial.index) return r; // still pumping this balloon
        if (task.id === "balloon" && r.balloon) await new Promise((res) => setTimeout(res, 700)); // show burst / banked
        advance(r);
        return r;
      } catch (e) {
        setError((e as Error).message);
        return null;
      }
    },
    [trial, sessionId, task.id, advance],
  );

  useEffect(() => {
    if (phase !== "intro") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") {
        e.preventDefault();
        void start();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, start]);

  if (phase === "intro") {
    return (
      <div className="max-w-reading">
        <p className="label text-ink-3">Task · about {task.minutes} min</p>
        <h2 className="mt-6 text-h1 font-medium text-ink">{task.title}</h2>
        <p className="mt-4 text-body-l text-ink-2">{task.instructions}</p>
        <ul className="mt-8 flex flex-col gap-3 border-t border-rule pt-6 text-small text-ink-2">
          <li>{HOW[task.id]}</li>
          {task.practice ? <li>You start with {task.practice} untimed practice items and see whether you were right.</li> : null}
          {task.id !== "learning_rate" && task.practice ? <li>After practice there is no right/wrong feedback. That is deliberate: it keeps the measure clean.</li> : null}
        </ul>
        <div className="mt-10 flex items-center gap-4">
          <Button onClick={start}>Start</Button>
          <span className="label text-ink-3">
            or press <Kbd>↵</Kbd>
          </span>
        </div>
        {error ? <p role="alert" className="mt-4 text-small text-caution">{error}</p> : null}
      </div>
    );
  }

  if (phase === "practice-done") {
    return (
      <div className="max-w-reading">
        <p className="label text-positive">Practice done</p>
        <h2 className="mt-6 text-h1 font-medium text-ink">Now the scored part.</h2>
        <p className="mt-4 text-body-l text-ink-2">
          {task.id === "learning_rate" ? "Feedback continues." : "From here on you won't see whether answers are right."}
          {trial && "timeLimitSec" in trial && trial.timeLimitSec ? " Each item has a time limit." : ""}
        </p>
        <Button className="mt-10" autoFocus onClick={() => setPhase("running")}>
          Continue
        </Button>
      </div>
    );
  }

  if (!trial) return <p className="label text-ink-3">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-rule pb-3">
        <p className="label text-ink-3">
          {task.title}
          {trial.practice ? " · practice" : ""}
          {trial.scoredTotal && !trial.practice ? ` · ${String(trial.index + 1).padStart(2, "0")} / ${trial.scoredTotal}` : ""}
        </p>
        <p aria-live="polite" className={cn("label", feedback ? (feedback.correct ? "text-positive" : "text-caution") : "text-ink-3")}>
          {feedback ? (feedback.correct ? "Correct" : "Not quite") : ""}
        </p>
      </div>
      <TrialView key={`${trial.practice}-${trial.index}`} trial={trial} respond={respond} />
      {error ? <p role="alert" className="mt-4 text-small text-caution">{error}. Reload to continue; this task will restart with new items.</p> : null}
    </div>
  );
}

function TrialView({ trial, respond }: { trial: Trial; respond: Respond }) {
  const t: PublicTrial = trial;
  switch (t.task) {
    case "matrix":
      return <MatrixTask trial={t} respond={respond} />;
    case "number_series":
    case "letter_series":
      return <SeriesTask trial={t} respond={respond} />;
    case "quant":
      return <QuantTask trial={t} respond={respond} />;
    case "rotation2d":
      return <RotationTask trial={t} respond={respond} />;
    case "backward_digits":
    case "corsi":
      return <SpanTask trial={t} respond={respond} />;
    case "symbol_match":
      return <SymbolMatchTask trial={t} respond={respond} />;
    case "choice_rt":
      return <ChoiceRtTask trial={t} respond={respond} />;
    case "learning_rate":
      return <LearningTask trial={t} respond={respond} />;
    case "balloon":
      return <BalloonTask trial={t} respond={respond} />;
    case "delay_discount":
      return <DiscountTask trial={t} respond={respond} />;
  }
}
