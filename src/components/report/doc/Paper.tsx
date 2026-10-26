import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A sheet of the report: white paper with a hairline edge on the canvas. Prints as its own page. */
export function Paper({ id, label, className, children, as: Tag = "section" }: { id?: string; label?: string; className?: string; children: ReactNode; as?: "section" | "header" | "article" }) {
  return (
    <Tag id={id} aria-label={label} className={cn("doc-sheet scroll-mt-24 border border-paper-edge bg-paper", className)}>
      {children}
    </Tag>
  );
}
