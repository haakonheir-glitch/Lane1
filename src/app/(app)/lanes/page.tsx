import type { Metadata } from "next";
import { Suspense } from "react";
import { AppPage } from "@/components/shell/AppPage";
import { LaneMap } from "@/components/lanes/LaneMap";
import { LaneSummary } from "@/components/lanes/LaneSummary";
import { CareerRow, CareerSection, HeroCareer, RankedCareer } from "@/components/lanes/CareerResults";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Misc";
import { getLaneMap, getUser } from "@/lib/data";
import { SampleBanner } from "@/components/report/SampleBanner";
import { OwnResultsNote } from "@/components/report/OwnResultsNote";
import { OnetAttribution } from "@/components/report/OnetAttribution";

export const metadata: Metadata = { title: "Career map" };

export default async function LanesPage({ searchParams }: PageProps<"/lanes">) {
  const { lane } = await searchParams;
  const [{ rows, vocab, detail, source, picks }, user] = await Promise.all([getLaneMap(typeof lane === "string" ? lane : null), getUser()]);
  const [best, ...next] = picks.overall;
  return (
    <AppPage
      title="Career map"
      meta={`${rows.length} career paths · ${vocab.families.length} families${source === "sample" ? " · sample" : ""}`}
      action={
        <ButtonLink href="/sprints" variant="secondary" size="sm">
          Sprints
        </ButtonLink>
      }
    >
      <div className="max-w-content">
        {source === "own" ? <OwnResultsNote className="mb-10" /> : <SampleBanner what="Career map results" className="mb-10" />}
        <p className="label text-ink-3">
          Career map <span className="px-1.5 text-ink-4">·</span> {user.reportId}
        </p>
        <h1 className="mt-5 max-w-[16ch] text-display font-medium text-ink">Where you fit best.</h1>
        <p className="mt-6 max-w-[60ch] text-body-l text-ink-2">
          {rows.length} career paths in {vocab.families.length} families, matched against your profile. These are the ones that use your strengths
          best, and the specific role to start in. A starting point for trying things, not a prediction of success.
        </p>

        <div className="mt-20">
          {best ? (
            <CareerSection index="01" label="Top five" id="best-h" title="Your five best fits" lead="The specific roles that suit you best, across every kind of career. Open one to see the full path, from first role up.">
              <HeroCareer p={best} />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {next.map((p, i) => (
                  <RankedCareer key={p.row.id} p={p} rank={i + 2} />
                ))}
              </div>
            </CareerSection>
          ) : null}

          {picks.corporate.length ? (
            <CareerSection index="02" label="Corporate" id="corporate-h" title="Corporate careers" lead="Your next five best fits inside companies and professional firms, after your top five.">
              <ol className="flex flex-col gap-2">
                {picks.corporate.map((p, i) => (
                  <CareerRow key={p.row.id} p={p} rank={i + 1} index={i} />
                ))}
              </ol>
            </CareerSection>
          ) : null}

          {picks.ownPath.length ? (
            <CareerSection
              index="03"
              label="Non-corporate"
              id="own-path-h"
              title="Non-corporate careers"
              lead="Your next five best fits on your own terms: independent, creative, performing, competing and founding careers, after your top five."
            >
              <ol className="flex flex-col gap-2">
                {picks.ownPath.map((p, i) => (
                  <CareerRow key={p.row.id} p={p} rank={i + 1} index={i} />
                ))}
              </ol>
            </CareerSection>
          ) : null}

          <CareerSection index="04" label="Overview" id="split-h" title="Your whole map" lead="How every career path sorts for you, and the ones you told us about.">
            <LaneSummary rows={rows} />
          </CareerSection>

          <CareerSection index="05" label="Explore" id="all-h" title="All career paths" lead="Filter by how you'd work, how it pays, how you get in and how you can try it. Open any career path for its roles and a plan.">
            <Suspense fallback={<Skeleton lines={8} />}>
              <LaneMap rows={rows} vocab={vocab} detail={detail} />
            </Suspense>
          </CareerSection>
        </div>
        <OnetAttribution className="mt-20" />
      </div>
    </AppPage>
  );
}
