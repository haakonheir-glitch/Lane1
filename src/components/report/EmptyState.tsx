import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A short explanation and one action. No illustration. */
export function EmptyState({
  label,
  title,
  body,
  action,
  className,
}: {
  label?: string;
  title: string;
  body: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-y border-dashed border-rule-strong py-10", className)}>
      {label ? <p className="label text-ink-3">{label}</p> : null}
      <p className="mt-2 text-body-l text-ink">{title}</p>
      <p className="mt-2 max-w-reading text-small text-ink-2">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
