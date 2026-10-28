import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { BandTag } from "@/components/lanes/FitIndicator";
import { FitRangeBar, fitText } from "@/components/lanes/FitRangeBar";
import { TraitConnections } from "@/components/lanes/TraitConnections";
import { OnetDbAttribution } from "@/components/report/OnetDbAttribution";
import type { CareerPick } from "@/lib/lanes/types";
import type { Connections } from "@/lib/view/connections";
import { pad2 } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Chapter 02 body, "Where this work exists": the closest career paths, each with fulfilment fit
 * (the headline: does the work give you what you need) and ability fit (can you meet what it
 * demands), both as the range 80% of the matching draws fall in; then how your clearest strengths
 * connect to them, and the way into the Career map. Under matching v1 there are no v2 fits, so only
 * the band shows. Server component.
 */
export function CareerPathsBody({ picks, connections, print }: { picks: CareerPick[]; connections: Connections; print?: boolean }) {
  const v2 = picks.some((p) => p.row.fulfilment);
  const anyAbility = picks.some((p) => p.row.ability);
  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="cp-top">
        <h3 id="cp-top" className="label text-ink-3">Your closest career paths</h3>
        <ol className="mt-4 border-t border-rule-strong">
          {picks.map((p, i) => (
            <li key={p.row.id} className="grid gap-x-8 gap-y-3 border-b border-rule py-5 md:grid-cols-[40px_minmax(0,1.2fr)_minmax(0,1fr)]">
              <span className="font-mono text-small text-ink-3 tabular">{pad2(i + 1)}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link href={`/lanes?lane=${p.row.id}&from=top`} className="text-body-l font-medium text-ink hover:underline hover:underline-offset-4">
                    {p.row.name}
                  </Link>
                  <BandTag band={p.row.band} />
                  {p.row.provenance === "estimated" ? <span className="label text-caution">Estimated career data</span> : null}
                </div>
                <p className="mt-1 text-small text-ink-3">{p.row.familyName}</p>
                {p.why.length ? <p className="mt-2 text-small text-ink-2">Why it fits: {p.why.join(" · ")}</p> : null}
              </div>
              {v2 ? (
                <dl className="grid gap-3">
                  <div>
                    <dt className="flex justify-between gap-3 text-small text-ink-2">
                      Fulfilment fit <span className="font-mono text-label text-ink-3">{p.row.fulfilment ? fitText(p.row.fulfilment) : "not enough data"}</span>
                    </dt>
                    <dd className="mt-1">
                      <FitRangeBar range={p.row.fulfilment} kind="fulfilment" label={`${p.row.name}: fulfilment fit`} />
                    </dd>
                  </div>
                  <div>
                    <dt className="flex justify-between gap-3 text-small text-ink-2">
                      Ability fit <span className="font-mono text-label text-ink-3">{p.row.ability ? fitText(p.row.ability) : "not enough reasoning data"}</span>
                    </dt>
                    <dd className="mt-1">
                      <FitRangeBar range={p.row.ability} kind="ability" label={`${p.row.name}: ability fit`} />
                    </dd>
                  </div>
                </dl>
              ) : null}
            </li>
          ))}
        </ol>
        <p className={cn("mt-3 max-w-[72ch] text-small text-ink-3", !v2 && "hidden")}>
          Fulfilment fit is the headline: does the work give you what you need (interests, values, value modes, working conditions, challenge)? It is relative to you: 50 is
          your average career path, so it can&apos;t be compared with anyone else&apos;s. Ability fit is secondary: 100 means the work demands nothing beyond your measured
          reasoning range.{anyAbility ? "" : " It needs results in enough reasoning areas (sessions S3 and S4)."} The bands come from how stable each career path&apos;s rank is across 500
          draws of your scores. A good fit is not a prediction of success.
        </p>
      </section>

      {connections.traits.length && connections.paths.length ? (
        <section aria-labelledby="cp-why">
          <h3 id="cp-why" className="label text-ink-3">How your clearest strengths connect to them</h3>
          <TraitConnections data={connections} className="mt-4" />
        </section>
      ) : null}

      {print ? null : (
        <div className="doc-screen flex flex-wrap items-center gap-4">
          <ButtonLink href="/lanes">Open your Career map</ButtonLink>
          <span className="text-small text-ink-3">All 205 career paths on fulfilment and ability, with a typical day, what fits, what rubs and where you&apos;d start.</span>
        </div>
      )}
      {v2 ? <OnetDbAttribution /> : null}
    </div>
  );
}
