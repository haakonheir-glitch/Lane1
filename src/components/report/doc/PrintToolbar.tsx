"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

/** Screen-only bar above the print view: save as PDF through the browser, or go back. */
export function PrintToolbar({ back }: { back: string }) {
  return (
    <div className="doc-screen sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-rule bg-bg/95 px-6 py-3">
      <p className="text-small text-ink-2">A4 document. Choose &ldquo;Save as PDF&rdquo; in the print dialog.</p>
      <div className="flex items-center gap-3">
        <Link href={back} className="text-small text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink">
          Back to the report
        </Link>
        <Button size="sm" onClick={() => window.print()}>
          Save as PDF
        </Button>
      </div>
    </div>
  );
}
