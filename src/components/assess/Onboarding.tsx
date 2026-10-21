"use client";

import { useCallback, useEffect, useRef, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Kbd } from "@/components/ui/Misc";
import { ProgressBar } from "./ProgressBar";
import { useAnswers } from "./useAnswers";
import { cn } from "@/lib/cn";

type Step =
  | { id: "name"; kind: "text"; prompt: string; hint: string; placeholder: string }
  | { id: string; kind: "choice"; prompt: string; hint: string; options: string[] };

const steps: Step[] = [
  { id: "name", kind: "text", prompt: "What should we call you?", hint: "First name is enough. It appears on your report.", placeholder: "Your name" },
  { id: "age", kind: "choice", prompt: "Which age range are you in?", hint: "Used only to compare you with people at a similar stage.", options: ["18–24", "25–34", "35–44", "45–54", "55 or over"] },
  {
    id: "situation",
    kind: "choice",
    prompt: "Where are you right now?",
    hint: "Pick the closest. You can change it later.",
    options: ["Studying", "Employed, fairly settled", "Employed, considering a change", "Between jobs", "Self-employed"],
  },
  {
    id: "clarity",
    kind: "choice",
    prompt: "What do you most want clarity on?",
    hint: "This sets which lanes we suggest testing first.",
    options: [
      "Which direction to study or train in",
      "Whether to leave my current field",
      "Whether to go independent",
      "Which of a few options to commit to",
      "I don't know yet. That's why I'm here",
    ],
  },
];

export function Onboarding() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const { answers, setAnswer } = useAnswers<string>("onboarding");
  const focusRef = useRef<HTMLDivElement>(null);

  const raw = params.get("step");
  const done = raw === "done";
  const n = done ? steps.length + 1 : Math.min(steps.length, Math.max(1, Number(raw) || 1));
  const step = steps[n - 1];

  const go = useCallback((s: number | "done") => router.replace(`${pathname}?step=${s}`, { scroll: false }), [router, pathname]);
  const next = useCallback(() => {
    if (!step || !answers[step.id]) return;
    go(n >= steps.length ? "done" : n + 1);
  }, [step, answers, n, go]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!step || step.kind !== "choice" || e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = Number(e.key) - 1;
      const opt = step.options[idx];
      if (opt) {
        e.preventDefault();
        setAnswer(step.id, opt);
        window.setTimeout(() => go(n >= steps.length ? "done" : n + 1), 180);
      } else if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON" && (e.target as HTMLElement).tagName !== "A") {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, setAnswer, go, n, next]);

  useEffect(() => {
    const el = focusRef.current;
    if (!el) return;
    const input = el.querySelector<HTMLInputElement>("input");
    (input ?? el).focus({ preventScroll: true });
  }, [n]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    next();
  }

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
                  <p className="label text-positive">Set up</p>
                  <h1 className="mt-6 text-h1 font-medium text-ink">
                    Thanks{answers.name ? `, ${answers.name}` : ""}. Next: about 35 minutes of assessment.
                  </h1>
                  <p className="mt-4 text-body-l text-ink-2">
                    Four modules, any order, saved as you go. Your first Lane Map is ready as soon as interests and
                    personality are done.
                  </p>
                  <div className="mt-10 flex flex-wrap gap-3">
                    <ButtonLink href="/assess">Go to assessment</ButtonLink>
                    <Button variant="ghost" onClick={() => go(steps.length)}>
                      Back
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={onSubmit}>
                  <p className="label text-ink-3">
                    Step {String(n).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
                  </p>
                  <h1 className="mt-6 text-h1 font-medium text-ink">{step.prompt}</h1>
                  <p className="mt-3 text-body text-ink-3">{step.hint}</p>

                  {step.kind === "text" ? (
                    <div className="mt-10">
                      <label htmlFor="ob-name" className="sr-only">
                        {step.prompt}
                      </label>
                      <Input
                        id="ob-name"
                        autoComplete="given-name"
                        placeholder={step.placeholder}
                        value={answers[step.id] ?? ""}
                        onChange={(e) => setAnswer(step.id, e.target.value)}
                        className="h-14 border-0 border-b border-rule-strong bg-transparent px-0 text-h3 rounded-none focus-visible:border-accent"
                      />
                    </div>
                  ) : (
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
                              <input
                                type="radio"
                                name={step.id}
                                value={opt}
                                checked={checked}
                                onChange={() => {
                                  setAnswer(step.id, opt);
                                  window.setTimeout(() => go(n >= steps.length ? "done" : n + 1), 180);
                                }}
                                className="sr-only"
                              />
                              <span className={cn("font-mono text-small", checked ? "text-bg" : "text-ink-3")}>{i + 1}</span>
                              <span className="text-body">{opt}</span>
                              <Kbd className={cn("hidden sm:inline-flex", checked && "border-bg/40 text-bg")}>{i + 1}</Kbd>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  )}

                  <div className="mt-10 flex items-center justify-between gap-4">
                    <Button variant="ghost" size="sm" onClick={() => go(n - 1)} disabled={n <= 1}>
                      <ArrowLeft aria-hidden strokeWidth={1.5} className="size-4" /> Back
                    </Button>
                    <div className="flex items-center gap-4">
                      <span className="hidden label text-ink-3 sm:inline">
                        <Kbd>↵</Kbd> continue
                      </span>
                      <Button type="submit" disabled={!answers[step.id]}>
                        Continue
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
