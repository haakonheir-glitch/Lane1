import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { CareerPick } from "@/lib/lanes/types";
import { entryLabel, payoffLabel, sprintLabel, WINNER_TAKE_ALL_NOTE } from "@/lib/lanes/labels";
import { pad2 } from "@/lib/format";
import { BandTag, FitIndicator, fitWords } from "./FitIndicator";
import { cn } from "@/lib/cn";

/*
 * The Career map's result cards. Each career sits in its own white box on the page grey, with a
 * hairline border that darkens on hover; the best fit gets the hero card. Cards rise in one after
 * another when the page opens (the only motion; off under prefers-reduced-motion). No shadows,
 * no gradients: contrast comes from surface, border and type.
 */

const href = (p: CareerPick) => `/lanes?lane=${p.row.id}&from=top`;
const rise = (i: number): CSSProperties => ({ animationDelay: `${80 + i * 70}ms` });

const ENTRY_NOTE: Record<CareerPick["entryNote"], string> = {
  standard: "",
  from_experience: "From your current experience",
  via_other_lane: "Usually entered from another career at mid level",
  needs_experience: "Needs experience elsewhere first",
};

function Why({ items, className }: { items: string[]; className?: string }) {
  if (!items.length) return null;
  return (
    <p className={cn("text-small text-ink-2", className)}>
      <span className="label text-ink-3">Why it fits</span>
      <span className="ml-2">{items.join(" · ")}</span>
    </p>
  );
}

function Meta({ p, className }: { p: CareerPick; className?: string }) {
  return (
    <p className={cn("flex flex-wrap gap-x-2 gap-y-1 label text-ink-3", className)}>
      <span>{payoffLabel[p.row.payoff]}</span>
      <span aria-hidden className="text-ink-4">·</span>
      <span>{entryLabel[p.row.entry]}</span>
      <span aria-hidden className="text-ink-4">·</span>
      <span>Try it: {sprintLabel[p.row.sprint]}</span>
    </p>
  );
}

function RoleTitle({ p, className }: { p: CareerPick; className?: string }) {
  return <span className={className}>{p.role?.title ?? p.row.name}</span>;
}

/** The best fit: the role as the headline, then the career path, the reason and how to try it. */
export function HeroCareer({ p }: { p: CareerPick }) {
  return (
    <Link
      href={href(p)}
      scroll={false}
      style={rise(0)}
      className="group relative block animate-rise rounded-sm border border-rule-strong bg-surface p-6 transition-quiet hover:border-ink sm:p-10"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] rounded-t-sm bg-accent" />
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="label text-accent">
          <span className="font-mono">01</span>
          <span className="px-2 text-ink-4">·</span>
          Your best fit
        </p>
        <BandTag band={p.row.band} />
      </div>
      <h3 className="mt-8 max-w-[22ch] text-h1 font-medium text-ink">
        <RoleTitle p={p} />
      </h3>
      <p className="mt-3 text-body-l text-ink-2">
        {p.role ? (
          <>
            {p.role.levelLabel} in <span className="text-ink">{p.row.name}</span>
          </>
        ) : (
          ENTRY_NOTE[p.entryNote]
        )}
        <span className="text-ink-3"> · {p.row.familyName}</span>
      </p>

      <div className="mt-10 grid gap-8 border-t border-rule pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <div className="flex flex-col gap-4">
          {p.role ? <p className="text-body text-ink">{p.role.reason}</p> : null}
          <Why items={p.why} />
          {p.alsoRoles.length ? (
            <p className="text-small text-ink-2">
              <span className="label text-ink-3">Also in this career</span>
              <span className="ml-2">{p.alsoRoles.join(" · ")}</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <p className="label text-ink-3">Fit compared with your other career paths</p>
            <FitIndicator vsAverage={p.row.vsAverage} se={p.row.se} className="mt-3 h-4" />
            <p className="mt-2 text-small text-ink-2">{fitWords(p.row.vsAverage)}</p>
          </div>
          <Meta p={p} />
          {p.row.payoff === "winner_take_all" ? <p className="text-small text-ink-3">{WINNER_TAKE_ALL_NOTE}</p> : null}
          <span className="mt-2 inline-flex items-center gap-2 text-small font-medium text-ink">
            Explore this career path
            <span aria-hidden className="transition-quiet group-hover:translate-x-1">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Ranks 2–5: a 2×2 grid of equal cards, rank in large mono. */
export function RankedCareer({ p, rank }: { p: CareerPick; rank: number }) {
  return (
    <Link
      href={href(p)}
      scroll={false}
      style={rise(rank - 1)}
      className="group flex animate-rise flex-col rounded-sm border border-rule-strong bg-surface p-6 transition-quiet hover:border-ink"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="font-mono text-figure tabular text-ink-3 transition-quiet group-hover:text-ink">{pad2(rank)}</span>
        <BandTag band={p.row.band} />
      </div>
      <h3 className="mt-6 text-h3 font-medium text-ink">
        <RoleTitle p={p} />
      </h3>
      <p className="mt-1 text-small text-ink-2">
        {p.row.name}
        <span className="text-ink-3"> · {p.row.familyName}</span>
      </p>
      <FitIndicator vsAverage={p.row.vsAverage} se={p.row.se} className="mt-6" />
      <Why items={p.why.slice(0, 2)} className="mt-5" />
      <Meta p={p} className="mt-auto pt-5" />
    </Link>
  );
}

/** Corporate and non-corporate lists: one boxed row per career, separated by a gap. */
export function CareerRow({ p, rank, index }: { p: CareerPick; rank: number; index: number }) {
  return (
    <li>
      <Link
        href={href(p)}
        scroll={false}
        style={rise(index)}
        className="group grid animate-rise grid-cols-[40px_minmax(0,1fr)] items-center gap-x-5 gap-y-3 rounded-sm border border-rule-strong bg-surface px-5 py-5 transition-quiet hover:border-ink md:grid-cols-[48px_minmax(0,1.5fr)_minmax(0,1fr)_160px_24px]"
      >
        <span className="font-mono text-h3 tabular text-ink-3 transition-quiet group-hover:text-ink">{pad2(rank)}</span>
        <span className="min-w-0">
          <span className="block text-body font-medium text-ink">
            <RoleTitle p={p} />
          </span>
          <span className="block text-small text-ink-2">
            {p.row.name}
            <span className="text-ink-3"> · {p.row.familyName}</span>
          </span>
        </span>
        <span className="col-start-2 text-small text-ink-2 md:col-start-auto">{p.why.slice(0, 2).join(" · ")}</span>
        <span className="col-start-2 flex flex-col gap-2 md:col-start-auto">
          <FitIndicator vsAverage={p.row.vsAverage} se={p.row.se} />
          <BandTag band={p.row.band} className="self-start" />
        </span>
        <span aria-hidden className="hidden text-ink-3 transition-quiet group-hover:translate-x-1 group-hover:text-ink md:block">
          →
        </span>
      </Link>
    </li>
  );
}

export function CareerSection({
  index,
  label,
  title,
  lead,
  children,
  id,
}: {
  index: string;
  label: string;
  title: string;
  lead: ReactNode;
  children: ReactNode;
  id: string;
}) {
  return (
    <section aria-labelledby={id} className="mt-24 first:mt-0">
      <header className="mb-8 border-t border-ink pt-3">
        <p className="label text-ink-3">
          <span className="mr-3 text-ink">§ {index}</span>
          {label}
        </p>
        <h2 id={id} className="mt-4 text-h2 font-medium text-ink">
          {title}
        </h2>
        <p className="mt-3 max-w-[64ch] text-body-l text-ink-2">{lead}</p>
      </header>
      {children}
    </section>
  );
}
