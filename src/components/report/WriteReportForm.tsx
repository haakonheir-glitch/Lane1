"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { writeMyReport } from "@/app/actions/report";

/** Consent and the button that has Claude write (or rewrite) the report. */
export function WriteReportForm({ label = "Write my report", configured }: { label?: string; configured: boolean }) {
  const router = useRouter();
  const id = useId();
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (!configured) {
    return (
      <p className="text-small text-ink-2">
        To turn this on, add your Anthropic API key to a file named <code className="font-mono">.env.local</code> in the project folder (
        <code className="font-mono">ANTHROPIC_API_KEY=sk-ant-…</code>) and restart the app. See the README, &ldquo;Written report&rdquo;.
      </p>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-small text-ink-2">
        <Checkbox id={id} checked={consent} onChange={(e) => setConsent(e.currentTarget.checked)} className="mt-0.5" />
        <span>
          Send my computed scores to Anthropic so Claude can write the report. This includes your scores, lane matches and the job titles you
          entered; it doesn&apos;t include your name, email or individual answers.
        </span>
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button
          disabled={!consent || pending}
          onClick={() =>
            start(async () => {
              setError("");
              const r = await writeMyReport(consent);
              if (r.ok) router.refresh();
              else setError(r.error);
            })
          }
        >
          {pending ? "Writing… (about a minute)" : label}
        </Button>
        {pending ? <span className="label text-ink-3">Claude is reading your scores</span> : null}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-small text-caution">
          {error}
        </p>
      ) : null}
    </div>
  );
}
