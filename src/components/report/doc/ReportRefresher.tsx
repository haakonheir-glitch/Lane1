"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { refreshMyReport } from "@/app/actions/report";

/**
 * Rewrites a written report that is older than the scores, once, on load. The previous version
 * stays on screen with a quiet "Updating…" until the new one is saved; then the page refreshes.
 */
export function ReportRefresher() {
  const router = useRouter();
  const started = useRef(false);
  const [state, setState] = useState<"updating" | "failed">("updating");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    refreshMyReport().then((r) => (r.ok ? router.refresh() : setState("failed")));
  }, [router]);
  return (
    <span role="status" className="ml-3 text-ink-3">
      {state === "updating" ? "Updating your written report…" : "Written report not updated"}
    </span>
  );
}
