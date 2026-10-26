import Link from "next/link";
import type { LaneRowData } from "@/lib/lanes/types";
import { BAND_ORDER, bandLabel } from "@/lib/matching/fit";
import { BandTag } from "./FitIndicator";
import { cn } from "@/lib/cn";

/**
 * How all career paths split across the fit bands, and the career paths the person named in
 * onboarding (current job, considering), each with its band. Bands, not ranks: no fit numbers.
 */
export function LaneSummary({ rows }: { rows: LaneRowData[] }) {
  const counts = BAND_ORDER.map((band) => ({ band, n: rows.filter((r) => r.band === band).length })).filter((c) => c.n > 0);
  const named = rows.filter((r) => r.current || r.considering);

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      <div className="rounded-sm border border-rule-strong bg-surface p-6 lg:col-span-7">
        <p className="label text-ink-3">All {rows.length} career paths</p>
        <div className="mt-6 flex h-2 w-full gap-px" aria-hidden>
          {counts.map((c) => (
            <span
              key={c.band}
              className={cn(c.band === "strong" ? "bg-ink" : c.band === "testing" ? "bg-data-band" : "bg-rule-strong")}
              style={{ width: `${(c.n / rows.length) * 100}%` }}
            />
          ))}
        </div>
        <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3">
          {counts.map((c) => (
            <div key={c.band} className="flex flex-col">
              <dd className="font-mono text-figure tabular text-ink">{c.n}</dd>
              <dt className="label text-ink-3">{bandLabel[c.band]}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-[56ch] text-small text-ink-2">
          A career path is a strong fit when it uses more of your stronger traits than your weaker ones, clearly enough to survive measurement
          error. Bands, not ranks: neighbours inside a band are not reliably different.
        </p>
      </div>
      <div className="rounded-sm border border-rule-strong bg-surface p-6 lg:col-span-5">
        <p className="label text-ink-3">Career paths you named</p>
        {named.length ? (
          <ul className="mt-4">
            {named.map((l) => (
              <li key={l.id} className="border-b border-rule last:border-b-0">
                <Link href={`/lanes?lane=${l.id}`} scroll={false} className="flex items-center justify-between gap-4 py-3 transition-quiet hover:text-ink">
                  <span className="min-w-0">
                    <span className="block truncate text-body text-ink">{l.name}</span>
                    <span className="block label text-ink-3">{l.current ? "Your current career" : "You're considering it"}</span>
                  </span>
                  <BandTag band={l.band} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-small text-ink-2">
            <Link href="/start?step=3" className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
              Add your current job and the careers you&apos;re considering
            </Link>{" "}
            to see how they fit.
          </p>
        )}
      </div>
    </div>
  );
}
