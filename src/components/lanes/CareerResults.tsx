import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { CareerPick } from "@/lib/lanes/types";
import { BandTag, FitIndicator } from "./FitIndicator";
import { PathMarkers } from "./Directions";

/*
 * The Career map's result cards. Each career sits in its own white box on the page grey, with a
 * hairline border that darkens on hover (the directions are in Directions.tsx). Cards rise in one after
 * another when the page opens (the only motion; off under prefers-reduced-motion). No shadows,
 * no gradients: contrast comes from surface, border and type.
 */

const href = (p: CareerPick) => `/lanes?lane=${p.row.id}&from=top`;
const rise = (i: number): CSSProperties => ({ animationDelay: `${80 + i * 70}ms` });

function RoleTitle({ p, className }: { p: CareerPick; className?: string }) {
  return <span className={className}>{p.role?.title ?? p.row.name}</span>;
}

/** Corporate and non-corporate lists: one boxed row per career, in fit order without rank numbers. */
export function CareerRow({ p, index }: { p: CareerPick; index: number }) {
  return (
    <li>
      <Link
        href={href(p)}
        scroll={false}
        style={rise(index)}
        className="group grid animate-rise grid-cols-[minmax(0,1fr)] items-center gap-x-5 gap-y-3 rounded-sm border border-rule-strong bg-paper px-5 py-5 transition-quiet hover:border-ink md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_160px_24px]"
      >
        <span className="min-w-0">
          <span className="block text-body font-medium text-ink">
            <RoleTitle p={p} />
          </span>
          <span className="block text-small text-ink-2">
            {p.row.name}
            <span className="text-ink-3"> · {p.row.familyName}</span>
          </span>
          <PathMarkers p={p} className="mt-1 block" />
        </span>
        <span className="text-small text-ink-2 md:col-start-auto">{p.why.slice(0, 2).join(" · ")}</span>
        <span className="flex flex-col gap-2">
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
