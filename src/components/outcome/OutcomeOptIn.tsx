"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { setOutcomeConsent } from "@/app/actions/outcome";

/**
 * The outcome check-in opt-in at the end of the report: an unticked box, stored only on an
 * explicit yes. `consentedAt` and `next` are ISO dates when the person has already opted in.
 */
export function OutcomeOptIn({ consentedAt, next, due }: { consentedAt: string | null; next: string | null; due: boolean }) {
  const router = useRouter();
  const id = useId();
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

  if (consentedAt) {
    return (
      <p className="text-small text-ink-2">
        {due ? (
          <>
            Your check-in is open.{" "}
            <Link href="/check-in" className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
              Answer the two questions
            </Link>
            .
          </>
        ) : next ? (
          <>You&apos;re signed up. Your next check-in opens on {fmt(next)}; it appears here and on your report when it&apos;s due.</>
        ) : (
          <>Thank you: you&apos;ve answered both check-ins.</>
        )}{" "}
        You can stop in Settings.
      </p>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-small text-ink-2">
        <Checkbox id={id} checked={consent} onChange={(e) => setConsent(e.currentTarget.checked)} className="mt-0.5" />
        <span>
          Ask me two questions in 6 and 12 months: what I&apos;m doing now, and how fulfilled I am by it. My answers help check how well these matches hold up. No
          emails yet: the questions appear here when they&apos;re due. You can stop at any time in Settings.
        </span>
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button
          variant="secondary"
          disabled={!consent || pending}
          onClick={() =>
            start(async () => {
              setError("");
              const r = await setOutcomeConsent(consent);
              if (r.ok) router.refresh();
              else setError(r.error);
            })
          }
        >
          {pending ? "Saving…" : "Sign me up"}
        </Button>
        <span className="text-small text-caution" aria-live="polite">
          {error}
        </span>
      </div>
    </div>
  );
}
