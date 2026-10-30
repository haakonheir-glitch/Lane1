"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Misc";
import { ProgressBar } from "./ProgressBar";
import { JobTitleSearch } from "@/components/onboarding/JobTitleSearch";
import { saveOnboarding } from "@/app/actions/onboarding";
import type { OnboardingAnswers } from "@/lib/types";
import type { YearsBand } from "@/lib/matching";
import type { JobTitleHit } from "@/lib/taxonomy";
import { cn } from "@/lib/cn";
import { isNavigationError } from "@/lib/action-errors";

/** A job title the person picked in the search, resolved to a lane (and a role when the taxonomy lists it). */
export type PickedTitle = { laneId: string; roleId: string | null; title: string; laneName: string };
export type OnboardingState = OnboardingAnswers & {
  current: PickedTitle | null;
  years: YearsBand | null;
  /** True once the person has answered the current-job step, including "not working right now". */
  currentAnswered: boolean;
  considering: PickedTitle[];
  /** "How satisfied are you in this work?" (1–7) for the current job; ground truth only, never used in matching. */
  satisfaction: number | null;
  /** Up to two previous jobs, each with the same question. Optional. */
  previous: (PickedTitle & { satisfaction: number | null })[];
  /** "Open to faith-based work" (optional): faith-based career paths are suggested only when checked. */
  openToFaith: boolean;
};

type ChoiceId = keyof OnboardingAnswers;
type Step =
  | { kind: "choice"; id: ChoiceId; prompt: string; hint: string; options: string[] }
  | { kind: "current"; prompt: string; hint: string }
  | { kind: "satisfaction"; prompt: string; hint: string }
  | { kind: "previous"; prompt: string; hint: string }
  | { kind: "considering"; prompt: string; hint: string };

const YEARS: { value: YearsBand; label: string }[] = [
  { value: "0", label: "Under a year" },
  { value: "lt2", label: "1–2 years" },
  { value: "2to5", label: "2–5 years" },
  { value: "5plus", label: "More than 5 years" },
];
const MAX_CONSIDERING = 3;
const MAX_PREVIOUS = 2;
const SATISFACTION = [1, 2, 3, 4, 5, 6, 7] as const;

const steps: Step[] = [
  { kind: "choice", id: "ageRange", prompt: "Which age range are you in?", hint: "Used only to compare you with people at a similar stage.", options: ["18–24", "25–34", "35–44", "45–54", "55 or over"] },
  {
    kind: "choice",
    id: "situation",
    prompt: "Where are you right now?",
    hint: "Pick the closest. You can change it later.",
    options: ["Studying", "Employed, fairly settled", "Employed, considering a change", "Between jobs", "Self-employed"],
  },
  { kind: "current", prompt: "What do you do now?", hint: "Your current or most recent job. It sets where you'd realistically start in that career." },
  { kind: "satisfaction", prompt: "How satisfied are you in this work?", hint: "1 is not at all, 7 is completely. Kept to check how well our matching works; it doesn't change your results." },
  {
    kind: "previous",
    prompt: "Any previous jobs?",
    hint: `Optional. Up to ${MAX_PREVIOUS}, each with the same question: how satisfied were you in that work?`,
  },
  { kind: "considering", prompt: "What are you considering?", hint: `Up to ${MAX_CONSIDERING} jobs or directions. We'll mark them on your Career map.` },
  {
    kind: "choice",
    id: "clarityGoal",
    prompt: "What do you most want clarity on?",
    hint: "This shapes which career paths we suggest testing first.",
    options: [
      "Which direction to study or train in",
      "Whether to leave my current field",
      "Whether to go independent",
      "Which of a few options to commit to",
      "I don't know yet. That's why I'm here",
    ],
  },
];

const pickFrom = (h: JobTitleHit): PickedTitle => ({ laneId: h.laneId, roleId: h.roleId, title: h.matched, laneName: h.laneName });

export function Onboarding({ name, initial }: { name: string; initial: OnboardingState }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const [answers, setAnswers] = useState<OnboardingState>(initial);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState("");
  const focusRef = useRef<HTMLDivElement>(null);

  const raw = params.get("step");
  const done = raw === "done";
  const n = done ? steps.length + 1 : Math.min(steps.length, Math.max(1, Number(raw) || 1));
  const step = steps[n - 1];

  const go = useCallback((s: number | "done") => router.replace(`${pathname}?step=${s}`, { scroll: false }), [router, pathname]);
  // The satisfaction question only applies to someone with a current job.
  const hasCurrent = !!answers.current;
  const applies = useCallback((i: number) => steps[i - 1]?.kind !== "satisfaction" || hasCurrent, [hasCurrent]);
  const advance = useCallback(() => {
    let k = n + 1;
    while (k <= steps.length && !applies(k)) k++;
    go(k > steps.length ? "done" : k);
  }, [go, n, applies]);
  const back = () => {
    let k = n - 1;
    while (k > 1 && !applies(k)) k--;
    go(Math.max(1, k));
  };

  const answered = (s: Step) =>
    s.kind === "choice"
      ? !!answers[s.id]
      : s.kind === "current"
        ? answers.currentAnswered && (answers.current === null || answers.years !== null)
        : s.kind === "satisfaction"
          ? !answers.current || answers.satisfaction !== null
          : s.kind === "previous"
            ? answers.previous.every((p) => p.satisfaction !== null)
            : true;

  const choose = useCallback(
    (id: ChoiceId, value: string) => {
      setAnswers((a) => ({ ...a, [id]: value }));
      window.setTimeout(advance, 180);
    },
    [advance],
  );
  const stepDone = !!step && answered(step);
  const next = useCallback(() => {
    if (stepDone) advance();
  }, [stepDone, advance]);

  function finish() {
    setError("");
    startSaving(async () => {
      try {
        await saveOnboarding({
          ageRange: answers.ageRange ?? "",
          situation: answers.situation ?? "",
          clarityGoal: answers.clarityGoal ?? "",
          current: answers.current ? { laneId: answers.current.laneId, roleId: answers.current.roleId, title: answers.current.title, years: answers.years, satisfaction: answers.satisfaction } : null,
          considering: answers.considering.map(({ laneId, roleId, title }) => ({ laneId, roleId, title })),
          previous: answers.previous.flatMap(({ laneId, roleId, title, satisfaction }) => (satisfaction === null ? [] : [{ laneId, roleId, title, satisfaction }])),
          openToFaith: answers.openToFaith,
        });
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
      if (!step || tag === "INPUT" || tag === "TEXTAREA") return;
      const opt = step.kind === "choice" ? step.options[Number(e.key) - 1] : undefined;
      if (opt && step.kind === "choice") {
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

  const complete = steps.every(answered);

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
                  <h1 className="mt-6 text-h1 font-medium text-ink">Thanks, {name}. Next: the assessment.</h1>
                  <p className="mt-4 text-body-l text-ink-2">
                    Five sessions, about 135 minutes in total, saved as you go. The first session (about 22 minutes) gives you your interests and
                    work values.
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

                  {step.kind === "choice" ? (
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
                  ) : step.kind === "current" ? (
                    <div className="mt-10">
                      {answers.current ? (
                        <>
                          <div className="flex items-start justify-between gap-4 rounded-xs border border-ink bg-surface px-4 py-3">
                            <div>
                              <p className="text-body text-ink">{answers.current.title}</p>
                              <p className="mt-0.5 label text-ink-3">Career path: {answers.current.laneName}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setAnswers((a) => ({ ...a, current: null, years: null, satisfaction: null, currentAnswered: false }))}>
                              Change
                            </Button>
                          </div>
                          <fieldset className="mt-8">
                            <legend className="label text-ink-3">How long have you done it?</legend>
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {YEARS.map((y) => (
                                <label
                                  key={y.value}
                                  className={cn(
                                    "flex h-12 cursor-pointer items-center justify-center rounded-xs border px-2 text-center text-small transition-quiet has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                                    answers.years === y.value ? "border-ink bg-ink text-bg" : "border-rule text-ink hover:bg-surface",
                                  )}
                                >
                                  <input type="radio" name="years" value={y.value} checked={answers.years === y.value} onChange={() => setAnswers((a) => ({ ...a, years: y.value }))} className="sr-only" />
                                  {y.label}
                                </label>
                              ))}
                            </div>
                          </fieldset>
                        </>
                      ) : (
                        <>
                          <JobTitleSearch
                            label="Search for your job title"
                            autoFocus
                            onSelect={(h) => setAnswers((a) => ({ ...a, current: pickFrom(h), years: null, satisfaction: null, currentAnswered: true }))}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setAnswers((a) => ({ ...a, current: null, years: null, satisfaction: null, currentAnswered: true }));
                              advance();
                            }}
                            className="mt-4 label text-ink-3 transition-quiet hover:text-ink"
                          >
                            I&apos;m not working right now
                          </button>
                        </>
                      )}
                    </div>
                  ) : step.kind === "satisfaction" ? (
                    <div className="mt-10">
                      {answers.current ? <p className="label text-ink-3">{answers.current.title}</p> : null}
                      <SatisfactionScale
                        name="satisfaction"
                        legend={step.prompt}
                        value={answers.satisfaction}
                        onChange={(v) => {
                          setAnswers((a) => ({ ...a, satisfaction: v }));
                          window.setTimeout(advance, 180);
                        }}
                      />
                    </div>
                  ) : step.kind === "previous" ? (
                    <div className="mt-10">
                      {answers.previous.length < MAX_PREVIOUS ? (
                        <JobTitleSearch
                          label="Search for a previous job"
                          onSelect={(h) =>
                            setAnswers((a) =>
                              a.previous.some((c) => c.laneId === h.laneId && c.title === h.matched) ? a : { ...a, previous: [...a.previous, { ...pickFrom(h), satisfaction: null }].slice(0, MAX_PREVIOUS) },
                            )
                          }
                        />
                      ) : (
                        <p className="text-small text-ink-3">That&apos;s two. Remove one to add another.</p>
                      )}
                      {answers.previous.length ? (
                        <ul className="mt-6 flex flex-col border-t border-rule" aria-label="Previous jobs">
                          {answers.previous.map((c, i) => (
                            <li key={`${c.laneId}|${c.title}`} className="border-b border-rule py-4">
                              <div className="flex items-center justify-between gap-4">
                                <span>
                                  <span className="block text-body text-ink">{c.title}</span>
                                  <span className="block label text-ink-3">Career path: {c.laneName}</span>
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Remove ${c.title}`}
                                  onClick={() => setAnswers((a) => ({ ...a, previous: a.previous.filter((x) => x !== c) }))}
                                  className="flex size-8 items-center justify-center rounded-xs text-ink-3 transition-quiet hover:bg-rule/60 hover:text-ink"
                                >
                                  <X aria-hidden strokeWidth={1.5} className="size-4" />
                                </button>
                              </div>
                              <SatisfactionScale
                                name={`previous-${i}`}
                                legend={`How satisfied were you as ${c.title}?`}
                                value={c.satisfaction}
                                onChange={(v) => setAnswers((a) => ({ ...a, previous: a.previous.map((x) => (x === c ? { ...x, satisfaction: v } : x)) }))}
                              />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-10">
                      {answers.considering.length < MAX_CONSIDERING ? (
                        <JobTitleSearch
                          label="Search for a job you're considering"
                          autoFocus
                          onSelect={(h) =>
                            setAnswers((a) =>
                              a.considering.some((c) => c.laneId === h.laneId && c.title === h.matched) ? a : { ...a, considering: [...a.considering, pickFrom(h)].slice(0, MAX_CONSIDERING) },
                            )
                          }
                        />
                      ) : (
                        <p className="text-small text-ink-3">That&apos;s three. Remove one to add another.</p>
                      )}
                      <label className="mt-6 flex cursor-pointer items-start gap-3 text-small text-ink-2">
                        <input
                          type="checkbox"
                          checked={answers.openToFaith}
                          onChange={(e) => setAnswers((a) => ({ ...a, openToFaith: e.target.checked }))}
                          className="mt-0.5 size-4 accent-[var(--color-accent)]"
                        />
                        <span>Optional: I&apos;m open to faith-based work. Career paths that require a personal faith are suggested only if you tick this. You can change it in Settings.</span>
                      </label>
                      {answers.considering.length ? (
                        <ul className="mt-6 flex flex-col border-t border-rule" aria-label="Jobs you're considering">
                          {answers.considering.map((c) => (
                            <li key={`${c.laneId}|${c.title}`} className="flex items-center justify-between gap-4 border-b border-rule py-3">
                              <span>
                                <span className="block text-body text-ink">{c.title}</span>
                                <span className="block label text-ink-3">Career path: {c.laneName}</span>
                              </span>
                              <button
                                type="button"
                                aria-label={`Remove ${c.title}`}
                                onClick={() => setAnswers((a) => ({ ...a, considering: a.considering.filter((x) => x !== c) }))}
                                className="flex size-8 items-center justify-center rounded-xs text-ink-3 transition-quiet hover:bg-rule/60 hover:text-ink"
                              >
                                <X aria-hidden strokeWidth={1.5} className="size-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-10 flex items-center justify-between gap-4">
                    <Button variant="ghost" size="sm" onClick={back} disabled={n <= 1}>
                      <ArrowLeft aria-hidden strokeWidth={1.5} className="size-4" /> Back
                    </Button>
                    <div className="flex items-center gap-4">
                      <span className="hidden label text-ink-3 sm:inline">
                        <Kbd>↵</Kbd> continue
                      </span>
                      <Button onClick={next} disabled={!stepDone}>
                        {(step.kind === "considering" && !answers.considering.length) || (step.kind === "previous" && !answers.previous.length) ? "Skip" : "Continue"}
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

/** A 1–7 satisfaction scale: 1 = not at all, 7 = completely. */
function SatisfactionScale({ name, legend, value, onChange }: { name: string; legend: string; value: number | null; onChange: (v: number) => void }) {
  return (
    <fieldset className="mt-4">
      <legend className="sr-only">{legend}</legend>
      <div className="grid grid-cols-7 gap-1.5">
        {SATISFACTION.map((v) => (
          <label
            key={v}
            className={cn(
              "flex h-12 cursor-pointer items-center justify-center rounded-xs border font-mono text-small tabular transition-quiet has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
              value === v ? "border-ink bg-ink text-bg" : "border-rule text-ink hover:bg-surface",
            )}
          >
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="sr-only" aria-label={v === 1 ? "1, not at all" : v === 7 ? "7, completely" : String(v)} />
            {v}
          </label>
        ))}
      </div>
      <div className="mt-2 flex justify-between label text-ink-3" aria-hidden>
        <span>Not at all</span>
        <span>Completely</span>
      </div>
    </fieldset>
  );
}
