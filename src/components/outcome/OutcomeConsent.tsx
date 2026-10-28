"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { withdrawOutcomeConsent } from "@/app/actions/outcome";

/** Settings: withdraws the outcome check-in consent, deleting the consent and any answers. */
export function OutcomeConsent({ consented }: { consented: boolean }) {
  const [done, setDone] = useState(!consented);
  const [pending, start] = useTransition();
  if (done) return <p className="text-small text-ink-2">You&apos;re not signed up. You can opt in at the end of your report.</p>;
  return (
    <div>
      <p className="text-small text-ink-2">You&apos;re signed up for two questions, 6 and 12 months after you opted in. Stopping deletes the consent and any answers you gave.</p>
      <Button variant="secondary" className="mt-4" disabled={pending} onClick={() => start(async () => void (await withdrawOutcomeConsent(), setDone(true)))}>
        {pending ? "Stopping…" : "Stop check-ins and delete my answers"}
      </Button>
    </div>
  );
}
