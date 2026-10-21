"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { abandonSprint, completeSprint, startSprint } from "@/app/actions/sprints";
import { isNavigationError } from "@/lib/action-errors";
import { cn } from "@/lib/cn";

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      try {
        setError("");
        await fn();
      } catch (e) {
        if (isNavigationError(e)) throw e;
        setError("That didn't work. Check your connection and try again.");
      }
    });
  return { pending, error, run };
}

export function StartSprintButton({ templateId, blockedBy }: { templateId: string; blockedBy?: { id: string; title: string } }) {
  const { pending, error, run } = useAction();
  if (blockedBy) {
    return (
      <p className="text-small text-ink-2">
        You have a sprint running (<Link href={`/sprints/${blockedBy.id}`} className="text-ink underline decoration-rule-strong underline-offset-4">{blockedBy.title}</Link>).
        One sprint at a time keeps the evidence clean. Finish or stop it first.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button onClick={() => run(() => startSprint(templateId))} disabled={pending}>
        {pending ? "Starting…" : "Start this sprint today"}
      </Button>
      <span className="text-small text-ink-3">Day 1 is today. Check in once a day.</span>
      {error ? <p role="alert" className="w-full text-small text-caution">{error}</p> : null}
    </div>
  );
}

/** Close-out: the one question that matters most, then mark the sprint complete. */
export function FinishSprint({ sprintId, lastDay }: { sprintId: string; lastDay: boolean }) {
  const router = useRouter();
  const { pending, error, run } = useAction();
  const [wants, setWants] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(lastDay);

  if (!open) {
    return (
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          Finish sprint early…
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Stop this sprint? It won't count as evidence.")) run(() => abandonSprint(sprintId));
          }}
        >
          Stop without finishing
        </Button>
        {error ? <p role="alert" className="w-full text-small text-caution">{error}</p> : null}
      </div>
    );
  }

  return (
    <section aria-labelledby="finish-h" className="rounded-sm border border-rule-strong bg-surface p-6">
      <p className="label text-ink-3">Close-out</p>
      <h2 id="finish-h" className="mt-2 text-h3 font-medium text-ink">
        Knowing what you know now, would you want to keep doing this work?
      </h2>
      <div role="radiogroup" aria-labelledby="finish-h" className="mt-6 flex gap-2">
        {[
          { v: true, l: "Yes, I'd continue" },
          { v: false, l: "No, I wouldn't" },
        ].map((o) => (
          <button
            key={o.l}
            type="button"
            role="radio"
            aria-checked={wants === o.v}
            onClick={() => setWants(o.v)}
            className={cn(
              "h-10 rounded-xs border px-4 text-small transition-quiet",
              wants === o.v ? "border-ink bg-ink text-bg" : "border-rule bg-surface text-ink hover:border-rule-strong",
            )}
          >
            {o.l}
          </button>
        ))}
      </div>
      <label className="mt-6 flex flex-col gap-2">
        <span className="label text-ink-3">Five-line summary (optional)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={1000}
          className="rounded-xs border border-rule bg-surface p-3 text-body text-ink transition-quiet hover:border-rule-strong focus-visible:border-accent"
        />
      </label>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          disabled={pending || wants === null}
          onClick={() =>
            run(async () => {
              await completeSprint(sprintId, { wantsToContinue: wants!, note: note || undefined });
              router.refresh();
            })
          }
        >
          {pending ? "Saving…" : "Complete sprint"}
        </Button>
        {!lastDay ? (
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Not yet
          </Button>
        ) : null}
      </div>
      {error ? <p role="alert" className="mt-3 text-small text-caution">{error}</p> : null}
    </section>
  );
}
