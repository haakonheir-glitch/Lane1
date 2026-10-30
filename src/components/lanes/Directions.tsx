import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { CareerDirection, CareerPick } from "@/lib/lanes/types";
import { BandTag } from "./FitIndicator";
import { cn } from "@/lib/cn";

/*
 * The strong fits as named directions, not a ranking (owner's decision, 2026-10-30): each direction
 * is a value mode (and family, when split), with 2–3 career paths in fit order and no rank numbers.
 * Server component; `after` adds per-career-path controls (e.g. "Does this resonate?").
 */

export const EQUAL_FIT_LINE = "These fit about equally well; the measurement can't separate them further.";

const href = (p: CareerPick) => `/lanes?lane=${p.row.id}&from=top`;
const rise = (i: number): CSSProperties => ({ animationDelay: `${80 + i * 70}ms` });

/** The estimated-career-data marker, carried in every list (owner's decision, 2026-10-30). */
export function PathMarkers({ p, className }: { p: Pick<CareerPick, "row">; className?: string }) {
  return p.row.provenance === "estimated" ? <span className={cn("label text-caution", className)}>Estimated career data</span> : null;
}

function PathItem({ p, after, linked = true }: { p: CareerPick; after?: (p: CareerPick) => ReactNode; linked?: boolean }) {
  const name = (
    <span className="text-body font-medium text-ink group-hover:underline group-hover:underline-offset-4">{p.role?.title ?? p.row.name}</span>
  );
  return (
    <li className="border-t border-rule py-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {linked ? (
          <Link href={href(p)} scroll={false} className="group">
            {name}
          </Link>
        ) : (
          name
        )}
        <BandTag band={p.row.band} />
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-2">
        <span>{p.role ? p.row.name : p.row.familyName}</span>
        {p.role ? <span className="text-ink-3">· {p.row.familyName}</span> : null}
        <PathMarkers p={p} />
      </p>
      {p.why.length ? <p className="mt-2 text-small text-ink-2">Why it fits: {p.why.slice(0, 2).join(" · ")}</p> : null}
      {p.row.capNote ? <p className="mt-1 text-small text-ink-3">{p.row.capNote}</p> : null}
      {after ? <div className="mt-2">{after(p)}</div> : null}
    </li>
  );
}

export function Directions({
  directions,
  after,
  linked = true,
  className,
  note = true,
}: {
  directions: CareerDirection[];
  after?: (p: CareerPick) => ReactNode;
  linked?: boolean;
  className?: string;
  note?: boolean;
}) {
  if (!directions.length) return null;
  return (
    <div className={className}>
      <div className="grid gap-3 md:grid-cols-2">
        {directions.map((d, i) => (
          <section
            key={d.id}
            aria-labelledby={`dir-${d.id}`}
            style={rise(i)}
            className={cn("flex animate-rise flex-col rounded-sm border bg-paper p-6", i === 0 ? "border-ink" : "border-rule-strong")}
          >
            <p className="label text-ink-3">Direction</p>
            <h3 id={`dir-${d.id}`} className="mt-2 text-h3 font-medium text-ink">
              {d.name}
            </h3>
            <p className="mt-1 text-small text-ink-2">{d.subtitle}</p>
            {d.why ? <p className="mt-3 text-small text-ink-2">{d.why}</p> : null}
            <ul className="mt-5 flex flex-col border-t border-rule pt-4">
              {d.picks.map((p) => (
                <PathItem key={p.row.id} p={p} after={after} linked={linked} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      {note ? <p className="mt-4 max-w-[72ch] text-small text-ink-3">{EQUAL_FIT_LINE}</p> : null}
    </div>
  );
}
