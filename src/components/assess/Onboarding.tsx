"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Misc";
import { ProgressBar } from "./ProgressBar";
import { saveOnboarding } from "@/app/actions/assessment";
import type { OnboardingAnswers } from "@/lib/types";
import { cn } from "@/lib/cn";
import { isNavigationError } from "@/lib/action-errors";

type StepId = keyof OnboardingAnswers;
type Step = { id: StepId; prompt: string; hint: string; options: string[] };

const steps: Step[] = [
  { id: "ageRange", prompt: "Which age range are you in?", hint: "Used only to compare you with people at a similar stage.", options: ["18–24", "25–34", "35–44", "45–54", "55 or over"] },
  {
    id: "situation",
    prompt: "Where are you right now?",
    hint: "Pick the closest. You can change it later.",
    options: ["Studying", "Employed, fairly settled", "Employed, considering a change", "Between jobs", "Self-employed"],
  },
  {
    id: "clarityGoal",
    prompt: "What do you most want clarity on?",
    hint: "This shapes which lanes we suggest testing first.",
    options: [
      "Which direction to study or train in",
      "Whether to leave my current field",
      "Whether to go independent",
      "Which of a few options to commit to",
      "I don't know yet. That's why I'm here",
    ],
  },
];

export function Onboarding({ name, initial }: { name: string; initial: OnboardingAnswers }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const [answers, setAnswers] = useState<OnboardingAnswers>(initial);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState("");
  const focusRef = useRef<HTMLDivElement>(null);

  const raw = params.get("step");
  const done = raw === "done";
  const n = done ? steps.length + 1 : Math.min(steps.length, Math.max(1, Number(raw) || 1));
  const step = steps[n - 1];

  const go = useCallback((s: number | "done") => router.replace(`${pathname}?step=${s}`, { scroll: false }), [router, pathname]);
  const choose = useCallback(
    (id: StepId, value: string) => {
      setAnswers((a) => ({ ...a, [id]: value }));
      window.setTimeout(() => go(n >= steps.length ? "done" : n + 1), 180);
    },
    [go, n],
  );
  const next = useCallback(() => {
    if (!step || !answers[step.id]) return;
    go(n >= steps.length ? "done" : n + 1);
  }, [step, answers, n, go]);

  function finish() {
    setError("");
    startSaving(async () => {
      try {
        await saveOnboarding({ ageRange: answers.ageRange ?? "", situation: answers.situation ?? "", clarityGoal: answers.clarityGoal ?? "" });
      } catch (e) {
        if (isNavigationError(e)) throw e;
        setError("Couldn't save. Check your connection and try again.");
      }
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (!step) return;
      const opt = step.options[Number(e.key) - 1];
      if (opt) {
        e.preventDefault();
        choose(step.id, opt);
      } else if (e.key === "Enter" && tag !== "BUTTON" && tag !== "A") {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, choose, next]);

  useEffect(() => {
    focusRef.current?.focus({ preventScroll: true });
  }, [n]);

  const complete = steps.every((s) => answers[s.id]);

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <ProgressBar value={Math.min(n - 1, steps.length)} max={steps.length} label={`Onboarding step ${Math.min(n, steps.length)} of ${steps.length}`} />
      <div className="page flex flex-1 flex-col justify-center py-16">
        <div ref={focusRef} tabIndex={-1} className="mx-auto w-full max-w-reading outline-none">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={n}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            >
              {done || !step ? (
                <div>
                  <p className="label text-positive">Ready</p>
                  <h1 className="mt-6 text-h1 font-medium text-ink">Thanks, {name}. Next: about 30 minutes of assessment.</h1>
                  <p className="mt-4 text-body-l text-ink-2">
                    Four modules, any order, saved as you go. Your first Lane Map is ready as soon as interests and
                    personality are done.
                  </p>
                  <p role="alert" className="mt-4 min-h-5 text-small text-caution">
                    {error || (!complete ? "One step is unanswered. Go back to finish it." : "")}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button onClick={finish} disabled={saving || !complete}>
                      {saving ? "Saving…" : "Go to assessment"}
                    </Button>
                    <Button variant="ghost" onClick={() => go(steps.length)}>
                      Back
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="label text-ink-3">
                    Step {String(n).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
                  </p>
                  <h1 className="mt-6 text-h1 font-medium text-ink">{step.prompt}</h1>
                  <p className="mt-3 text-body text-ink-3">{step.hint}</p>

                  <fieldset className="mt-10">
                    <legend className="sr-only">{step.prompt}</legend>
                    <div className="flex flex-col border-t border-rule">
                      {step.options.map((opt, i) => {
                        const checked = answers[step.id] === opt;
                        return (
                          <label
                            key={opt}
                            className={cn(
                              "grid h-14 cursor-pointer grid-cols-[32px_1fr_auto] items-center gap-4 border-b px-3 transition-quiet has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                              checked ? "border-ink bg-ink text-bg" : "border-rule text-ink hover:bg-surface",
                            )}
                          >
                            <input type="radio" name={step.id} value={opt} checked={checked} onChange={() => choose(step.id, opt)} className="sr-only" />
                            <span className={cn("font-mono text-small", checked ? "text-bg" : "text-ink-3")}>{i + 1}</span>
                            <span className="text-body">{opt}</span>
                            <Kbd className={cn("hidden sm:inline-flex", checked && "border-bg/40 text-bg")}>{i + 1}</Kbd>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="mt-10 flex items-center justify-between gap-4">
                    <Button variant="ghost" size="sm" onClick={() => go(n - 1)} disabled={n <= 1}>
                      <ArrowLeft aria-hidden strokeWidth={1.5} className="size-4" /> Back
                    </Button>
                    <div className="flex items-center gap-4">
                      <span className="hidden label text-ink-3 sm:inline">
                        <Kbd>↵</Kbd> continue
                      </span>
                      <Button onClick={next} disabled={!answers[step.id]}>
                        Continue
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
