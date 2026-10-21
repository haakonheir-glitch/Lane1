import type { Metadata } from "next";
import Link from "next/link";
import { AppPage } from "@/components/shell/AppPage";
import { SprintCard } from "@/components/sprints/SprintCard";
import { SectionHeader } from "@/components/report/SectionHeader";
import { EmptyState } from "@/components/report/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { SampleBanner } from "@/components/report/SampleBanner";
import { fmtSigned, formatDay, addDays } from "@/lib/format";
import { getLaneName, getSprints } from "@/lib/data";

export const metadata: Metadata = { title: "Sprints" };

export default async function SprintsPage() {
  const sprints = await getSprints();
  const active = sprints.find((s) => s.status === "active");
  const suggested = sprints.filter((s) => s.status === "suggested");
  const completed = sprints.filter((s) => s.status === "completed");

  return (
    <AppPage title="Sprints" meta={`${completed.length} completed · ${active ? 1 : 0} active`}>
      <div className="max-w-content">
        <SampleBanner what="sprint records" className="mb-10" />
        <p className="label text-ink-3">Evidence · Sprints</p>
        <h1 className="mt-4 max-w-[20ch] text-h1 font-medium text-ink">Try the work. Then decide.</h1>
        <p className="mt-4 max-w-reading text-body-l text-ink-2">
          A sprint is one to two weeks of real work in a lane. You log what you did, how fast you improved and how it
          felt. One sprint at a time keeps the signal clean.
        </p>

        <section className="mt-16" aria-labelledby="active-h">
          <SectionHeader index="01" label="Active" title="Current sprint" id="active-h" />
          {active ? (
            <SprintCard sprint={active} laneName={getLaneName(active.laneId)} size="lg" />
          ) : (
            <EmptyState
              title="No sprint running."
              body={suggested.length ? "Pick one of the suggestions below, or any lane from your Lane Map." : "Finish interests and personality first; your suggestions come from your Lane Map."}
              action={<ButtonLink href={suggested.length ? "/lanes" : "/assess"}>{suggested.length ? "Open Lane Map" : "Continue assessment"}</ButtonLink>}
            />
          )}
        </section>

        {suggested.length ? (
          <section className="mt-20" aria-labelledby="next-h">
            <SectionHeader index="02" label="Suggested next" title="Untested lanes near the top of your map" id="next-h" />
            <ul className="grid gap-px border border-rule bg-rule md:grid-cols-3">
              {suggested.map((s) => (
                <li key={s.id} className="flex flex-col bg-bg p-6">
                  <p className="label text-ink-3">
                    {getLaneName(s.laneId)} · {s.days} days
                  </p>
                  <h3 className="mt-3 text-h3 font-medium text-ink">{s.title}</h3>
                  <p className="mt-3 flex-1 text-small text-ink-2">{s.brief}</p>
                  <Link href={`/sprints/${s.id}`} className="mt-6 label text-ink transition-quiet hover:text-ink-2">
                    View plan →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-20" aria-labelledby="done-h">
          <SectionHeader index="03" label="Completed" title="What the evidence said" id="done-h" />
          {completed.length === 0 ? (
            <EmptyState title="Nothing completed yet." body="Completed sprints appear here with their outcome." />
          ) : (
            <ol className="border-t border-rule-strong">
              {completed.map((s) => {
                const o = s.outcome!;
                return (
                  <li key={s.id} className="grid gap-4 border-b border-rule py-6 md:grid-cols-[1.2fr_2fr_auto] md:gap-8">
                    <div>
                      <p className="label text-ink-3">
                        {getLaneName(s.laneId)} · {formatDay(s.startedOn!)}–{formatDay(addDays(s.startedOn!, s.days - 1))}
                      </p>
                      <h3 className="mt-2 text-body-l text-ink">
                        <Link href={`/sprints/${s.id}`} className="transition-quiet hover:text-ink-2">
                          {s.title}
                        </Link>
                      </h3>
                    </div>
                    <p className="text-small text-ink-2">{o.summary}</p>
                    <dl className="grid grid-cols-3 gap-4 md:w-64">
                      {[
                        { k: "Improve", v: o.improvementRate !== null ? `${fmtSigned(o.improvementRate)}%` : "—", tone: o.improvementRate !== null && o.improvementRate >= 20 ? "text-positive" : "text-ink" },
                        { k: "Energy", v: o.energyAvg.toFixed(1), u: "/7" },
                        { k: "Continue", v: o.wantsToContinue ? "Yes" : "No" },
                      ].map((d) => (
                        <div key={d.k} className="flex flex-col gap-1">
                          <dt className="label text-ink-3">{d.k}</dt>
                          <dd className={`font-mono text-small ${d.tone ?? "text-ink"}`}>
                            {d.v}
                            {d.u ? <span className="text-label text-ink-3"> {d.u}</span> : null}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </AppPage>
  );
}
