"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { stopReportUpdates } from "@/app/actions/report";

/** Withdraws consent for automatic written-report updates by deleting the stored reports. */
export function ReportConsent({ hasReport }: { hasReport: boolean }) {
  const [done, setDone] = useState(!hasReport);
  const [pending, start] = useTransition();
  if (done)
    return <p className="text-small text-ink-2">No written report is stored. Nothing is sent to Anthropic until you write one from your report.</p>;
  return (
    <div>
      <p className="text-small text-ink-2">
        Your written report is kept up to date: when your scores change, they are sent to Anthropic again and the report is rewritten. Stopping
        deletes your written reports; you can write a new one at any time.
      </p>
      <Button variant="secondary" className="mt-4" disabled={pending} onClick={() => start(async () => void (await stopReportUpdates(), setDone(true)))}>
        {pending ? "Stopping…" : "Stop updates and delete written reports"}
      </Button>
    </div>
  );
}
