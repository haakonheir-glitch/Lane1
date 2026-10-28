"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { JobTitleSearch } from "@/components/onboarding/JobTitleSearch";
import { saveOutcomeCheckIn } from "@/app/actions/outcome";
import { FULFILMENT_ANCHORS, FULFILMENT_QUESTION, type Wave } from "@/lib/outcome";
import { cn } from "@/lib/cn";

type Pick = { laneId: string; roleId: string | null; title: string; laneName: string };

/**
 * The two check-in questions: what you're doing now (the job-title search, as in onboarding, or
 * "not working right now") and how fulfilled you are by it, 1–7. Nothing else is asked.
 */
export function CheckInForm({ wave }: { wave: Wave }) {
  const router = useRouter();
  const notWorkingId = useId();
  const scaleId = useId();
  const [pick, setPick] = useState<Pick | null>(null);
  const [notWorking, setNotWorking] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const ready = (pick || notWorking) && score !== null;

  return (
    <form
      className="flex flex-col gap-10"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        start(async () => {
          setError("");
          const r = await saveOutcomeCheckIn({ wave, current: notWorking ? null : { laneId: pick!.laneId, roleId: pick!.roleId, title: pick!.title }, fulfilment: score! });
          if (r.ok) router.refresh();
          else setError(r.error);
        });
      }}
    >
      <fieldset>
        <legend className="text-body-l font-medium text-ink">1. What are you doing now?</legend>
        <div className={cn("mt-4", notWorking && "pointer-events-none opacity-40")} aria-disabled={notWorking || undefined}>
          <JobTitleSearch label="Your job title now" keepQuery onSelect={(h) => setPick({ laneId: h.laneId, roleId: h.roleId, title: h.matched, laneName: h.laneName })} />
        </div>
        {pick && !notWorking ? <p className="mt-2 text-small text-ink-2">Career path: {pick.laneName}</p> : null}
        <label htmlFor={notWorkingId} className="mt-4 flex cursor-pointer items-center gap-3 text-small text-ink-2">
          <Checkbox id={notWorkingId} checked={notWorking} onChange={(e) => setNotWorking(e.currentTarget.checked)} />
          I&apos;m not working right now
        </label>
      </fieldset>

      <fieldset>
        <legend id={scaleId} className="text-body-l font-medium text-ink">
          2. {FULFILMENT_QUESTION}
        </legend>
        <div role="radiogroup" aria-labelledby={scaleId} className="mt-4 grid max-w-[520px] grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={score === n}
              aria-label={`${n}${n === 1 ? ` (${FULFILMENT_ANCHORS[1]})` : n === 7 ? ` (${FULFILMENT_ANCHORS[7]})` : ""}`}
              onClick={() => setScore(n)}
              className={cn("h-11 rounded-xs border font-mono text-body tabular transition-quiet", score === n ? "border-ink bg-ink text-bg" : "border-rule-strong text-ink hover:border-ink")}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-2 flex max-w-[520px] justify-between text-label text-ink-3">
          <span>{FULFILMENT_ANCHORS[1]}</span>
          <span>{FULFILMENT_ANCHORS[7]}</span>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={!ready || pending}>
          {pending ? "Saving…" : "Send my answers"}
        </Button>
        <span className="text-small text-caution" aria-live="polite">
          {error}
        </span>
      </div>
    </form>
  );
}
