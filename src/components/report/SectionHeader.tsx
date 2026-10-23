import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Mono index label + H2 + hairline. Structures every page like a report. An optional `finding`
 * states the section's result in one sentence, so the reader gets the answer before the data.
 */
export function SectionHeader({
  index,
  label,
  title,
  aside,
  finding,
  id,
  as: Heading = "h2",
  className,
}: {
  index?: string;
  label: string;
  title?: ReactNode;
  aside?: ReactNode;
  finding?: ReactNode;
  id?: string;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <header className={cn("mb-8 border-t border-ink pt-3", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="label text-ink-3">
          {index ? <span className="mr-3 text-ink">§ {index}</span> : null}
          {label}
        </p>
        {aside ? <div className="label text-ink-3">{aside}</div> : null}
      </div>
      {title ? (
        <Heading id={id} className={cn("mt-4 font-medium text-ink", Heading === "h2" ? "text-h2" : "text-h3")}>
          {title}
        </Heading>
      ) : null}
      {finding ? <p className="mt-3 max-w-[60ch] text-body-l text-ink-2">{finding}</p> : null}
    </header>
  );
}
