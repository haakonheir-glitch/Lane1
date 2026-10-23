import Link from "next/link";
import type { LaneRowData } from "@/lib/lanes/types";
import { BAND_ORDER, bandLabel } from "@/lib/matching/fit";
import { payoffLabel, sprintLabel } from "@/lib/lanes/labels";
import { BandTag, FitIndicator } from "./FitIndicator";
import { cn } from "@/lib/cn";

const SHOWN = 5;

/**
 * The top of the Lane Map: how the 205 lanes split across the fit bands, the strong-fit lanes
 * to look at first (in the map's own default order, relative fit), and the lanes the person
 * named. Bands, not ranks: no fit numbers.
 */
export function LaneSummary({ rows }: { rows: LaneRowData[] }) {
  const counts = BAND_ORDER.map((band) => ({ band, n: rows.filter((r) => r.band === band).length })).filter((c) => c.n > 0);
  const strongest = rows
    .filter((r) => r.band === "strong")
    .sort((a, b) => (b.vsAverage ?? -Infinity) - (a.vsAverage ?? -Infinity) || a.name.localeCompare(b.name))
    .slice(0, SHOWN);
  const named = rows.filter((r) => r.current || r.considering);

  return (
    <section aria-labelledby="lane-summary-h" className="border-t border-ink pt-3">
      <div className="flex items-baseline justify-between gap-4">
        <p className="label text-ink-3">
          <span className="mr-3 text-ink">Summary</span>
          {rows.length} lanes
        </p>
        <p className="label text-ink-3">Bands, not ranks</p>
      </div>

      {/* How the map splits: one stacked bar, counts in mono. */}
      <div className="mt-6" aria-hidden>
        <div className="flex h-2 w-full gap-px">
          {counts.map((c) => (
            <span
              key={c.band}
              className={cn(c.band === "strong" ? "bg-ink" : c.band === "testing" ? "bg-data-band" : "bg-rule-strong")}
              style={{ width: `${(c.n / rows.length) * 100}%` }}
            />
          ))}
        </div>
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-10 gap-y-2">
        {counts.map((c) => (
          <div key={c.band} className="flex items-baseline gap-2">
            <dd className="font-mono text-h3 tabular text-ink">{c.n}</dd>
            <dt className="label text-ink-3">{bandLabel[c.band]}</dt>
          </div>
        ))}
      </dl>

      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <h2 id="lane-summary-h" className="text-h3 font-medium text-ink">
            Where to look first
          </h2>
          {strongest.length ? (
            <ol className="mt-4 border-t border-rule-strong">
              {strongest.map((l) => (
                <li key={l.id} className="border-b border-rule">
                  <Link
                    href={`/lanes?lane=${l.id}`}
                    scroll={false}
                    className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-x-6 py-3 transition-quiet hover:bg-surface sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_140px]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-body text-ink">{l.name}</span>
                      <span className="block truncate text-small text-ink-3">{l.familyName}</span>
                    </span>
                    <span className="hidden label text-ink-3 sm:block">
                      {payoffLabel[l.payoff]} · {sprintLabel[l.sprint]}
                    </span>
                    <FitIndicator vsAverage={l.vsAverage} se={l.se} />
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 max-w-reading text-small text-ink-2">
              No lane fits clearly better than the rest yet. Start with the lanes worth testing below, or complete more sessions.
            </p>
          )}
        </div>
        <div className="lg:col-span-4">
          <h2 className="text-h3 font-medium text-ink">Lanes you named</h2>
          {named.length ? (
            <ul className="mt-4 border-t border-rule-strong">
              {named.map((l) => (
                <li key={l.id} className="border-b border-rule">
                  <Link href={`/lanes?lane=${l.id}`} scroll={false} className="flex items-center justify-between gap-4 py-3 transition-quiet hover:bg-surface">
                    <span className="min-w-0">
                      <span className="block truncate text-body text-ink">{l.name}</span>
                      <span className="block label text-ink-3">{l.current ? "Your current lane" : "Considering"}</span>
                    </span>
                    <BandTag band={l.band} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-small text-ink-2">
              <Link href="/start?step=3" className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
                Add your current job and the lanes you&apos;re considering
              </Link>{" "}
              to see them here.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
