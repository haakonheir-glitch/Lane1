"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { compileStep, markRevealed } from "@/app/actions/milestones";
import { refreshMyReport, writeMyReport } from "@/app/actions/report";
import { cn } from "@/lib/cn";

type StepId = "scores" | "reasoning" | "matches" | "words";
type State = "waiting" | "running" | "done" | "skipped" | "failed";

/**
 * The report delivery after the last session: the real steps as they complete, then the cover
 * reveal, then the summary sheet. Each step is the actual work (no timers); writing the summary is
 * the Claude call and takes as long as it takes. Plays once: the page sets a cookie at the reveal.
 */
export function RevealFlow({
  cover,
  summary,
  hasReasoning,
  writtenConsent,
  configured,
}: {
  cover: ReactNode;
  summary: ReactNode;
  hasReasoning: boolean;
  /** A written report exists, so consent is on record and the summary can be refreshed directly. */
  writtenConsent: boolean;
  configured: boolean;
}) {
  const [steps, setSteps] = useState<Record<StepId, State>>({ scores: "running", reasoning: hasReasoning ? "running" : "skipped", matches: "waiting", words: configured ? "waiting" : "skipped" });
  const [askConsent, setAskConsent] = useState(false);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<"compiling" | "cover" | "summary">("compiling");
  const started = useRef(false);
  const set = (id: StepId, s: State) => setSteps((x) => ({ ...x, [id]: s }));

  const reveal = () => {
    setPhase("cover");
    void markRevealed();
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      // Interests, values, personality and reasoning are built in one pass from the stored session scores.
      const a = await compileStep("scores");
      set("scores", a.ok ? "done" : "failed");
      if (hasReasoning) set("reasoning", a.ok ? "done" : "failed");
      set("matches", "running");
      const b = await compileStep("matches");
      set("matches", b.ok ? "done" : "failed");
      if (!configured) return reveal();
      if (!writtenConsent) return setAskConsent(true);
      set("words", "running");
      const r = await refreshMyReport();
      set("words", r.ok ? "done" : "failed");
      reveal();
    })();
    // Runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "cover") return;
    // The summary follows once the cover has drawn in (the mark's reveal takes about a second).
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setPhase("summary"), reduced ? 0 : 1100);
    return () => clearTimeout(t);
  }, [phase]);

  async function write() {
    setAskConsent(false);
    set("words", "running");
    const r = await writeMyReport(true);
    set("words", r.ok ? "done" : "failed");
    reveal();
  }

  const LABEL: Record<StepId, string> = {
    scores: "Scoring your interests, values and personality",
    reasoning: "Estimating your reasoning range",
    matches: "Matching your profile against 205 career paths",
    words: "Writing your summary",
  };

  if (phase === "compiling")
    return (
      <section aria-labelledby="compile-h" className="mx-auto max-w-[560px] py-16">
        <p className="text-small text-ink-3">All five sessions are done</p>
        <h1 id="compile-h" className="mt-3 text-h1 font-medium text-ink">
          Compiling your report
        </h1>
        <ol className="mt-10 flex flex-col border-t border-rule" aria-live="polite">
          {(Object.keys(LABEL) as StepId[])
            .filter((id) => steps[id] !== "skipped")
            .map((id) => (
              <li key={id} className="flex items-center gap-4 border-b border-rule py-4">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border",
                    steps[id] === "done" ? "border-ink bg-ink text-bg" : steps[id] === "running" ? "border-ink" : "border-rule-strong",
                  )}
                >
                  {steps[id] === "done" ? <Check className="size-3.5" strokeWidth={2} /> : steps[id] === "running" ? <span className="size-1.5 rounded-full bg-ink" /> : null}
                </span>
                <span className={cn("text-body", steps[id] === "waiting" ? "text-ink-3" : "text-ink")}>{LABEL[id]}</span>
                <span className="ml-auto text-small text-ink-3">
                  {steps[id] === "running" ? (id === "words" ? "About a minute" : "Working") : steps[id] === "failed" ? "Couldn’t finish; you can retry from the report" : null}
                </span>
              </li>
            ))}
        </ol>
        {askConsent ? (
          <div className="mt-8 rounded-sm border border-rule-strong bg-paper p-6">
            <p className="text-body text-ink">Add a written summary?</p>
            <label className="mt-3 flex cursor-pointer items-start gap-3 text-small text-ink-2">
              <Checkbox checked={consent} onChange={(e) => setConsent(e.currentTarget.checked)} className="mt-0.5" />
              <span>
                Send my computed scores to Anthropic so Claude can write the summary. No name, email or individual answers. When your scores change it is
                rewritten the same way; you can stop this in Settings.
              </span>
            </label>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button disabled={!consent} onClick={write}>
                Write my summary
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  set("words", "skipped");
                  setAskConsent(false);
                  reveal();
                }}
              >
                Skip for now
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    );

  return (
    <div className="flex flex-col gap-8">
      <div className="animate-rise">{cover}</div>
      {phase === "summary" ? (
        <>
          <div className="animate-rise">{summary}</div>
          <div className="flex animate-rise flex-wrap gap-3" style={{ animationDelay: "150ms" }}>
            <ButtonLink href="/profile">Read your full report</ButtonLink>
            <ButtonLink href="/lanes" variant="secondary">
              Open your Career map
            </ButtonLink>
          </div>
        </>
      ) : null}
    </div>
  );
}
