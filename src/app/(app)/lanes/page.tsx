import type { Metadata } from "next";
import { Suspense } from "react";
import { AppPage } from "@/components/shell/AppPage";
import { LaneMap } from "@/components/lanes/LaneMap";
import { LaneSummary } from "@/components/lanes/LaneSummary";
import {
  CareerRow,
  CareerSection,
  HeroCareer,
  RankedCareer,
} from "@/components/lanes/CareerResults";
import { Skeleton } from "@/components/ui/Misc";
import { getLaneMap, getProfileView, getUser } from "@/lib/data";
import { TraitConnections } from "@/components/lanes/TraitConnections";
import { connections } from "@/lib/view/connections";
import { LOCKED_TEXT, reportTier } from "@/lib/tier";
import { SampleBanner } from "@/components/report/SampleBanner";
import { OwnResultsNote } from "@/components/report/OwnResultsNote";
import { OnetAttribution } from "@/components/report/OnetAttribution";

export const metadata: Metadata = { title: "Career map" };

export default async function LanesPage({ searchParams }: PageProps<"/lanes">) {
  const { lane } = await searchParams;
  const [{ rows, vocab, detail, source, picks }, user, { profile }] =
    await Promise.all([
      getLaneMap(typeof lane === "string" ? lane : null),
      getUser(),
      getProfileView(),
    ]);
  // The free tier shows the top three career paths; the full tier the whole map.
  const full = reportTier() === "full";
  const [best, ...next] = picks.overall.slice(0, full ? 5 : 3);
  const links = connections(profile, picks.overall);
  return (
    <AppPage
      title="Career map"
      meta={`${rows.length} career paths · ${vocab.families.length} families${source === "sample" ? " · sample" : ""}`}
    >
      <div className="max-w-content">
        {source === "own" ? (
          <OwnResultsNote className="mb-10" />
        ) : (
          <SampleBanner what="Career map results" className="mb-10" />
        )}
        <p className="label text-ink-3">
          Career map <span className="px-1.5 text-ink-4">·</span>{" "}
          {user.reportId}
        </p>
        <h1 className="mt-5 max-w-[16ch] text-display font-medium text-ink">
          Where you fit best.
        </h1>
        <p className="mt-6 max-w-[60ch] text-body-l text-ink-2">
          {rows.length} career paths in {vocab.families.length} families,
          matched against your profile. These are the ones that use your
          strengths best, and the specific role to start in. A guide to which
          careers to look into first, not a prediction of success.
        </p>

        <div className="mt-20">
          {best ? (
            <CareerSection
              index="01"
              label={full ? "Top five" : "Top three"}
              id="best-h"
              title={full ? "Your five best fits" : "Your three best fits"}
              lead="The specific roles that suit you best, across every kind of career. Open one to see the full path, from first role up."
            >
              <HeroCareer p={best} />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {next.map((p, i) => (
                  <RankedCareer key={p.row.id} p={p} rank={i + 2} />
                ))}
              </div>
            </CareerSection>
          ) : null}

          {full && links.traits.length ? (
            <CareerSection
              index="02"
              label="Why"
              id="why-h"
              title="What connects you to these career paths"
              lead="Your clearest strengths on the left. A line means the matching named that strength as a reason for the career path on the right."
            >
              <div className="rounded-sm border border-rule-strong bg-paper p-6 sm:p-10">
                <TraitConnections data={links} />
              </div>
            </CareerSection>
          ) : null}

          {!full ? (
            <CareerSection index="02" label="Detail" id="detail-h" title="Your three career paths in detail" lead="Open any of the three for its day-to-day work, how people get in, how it pays and where you'd start.">
              <Suspense fallback={<Skeleton lines={4} />}>
                <LaneMap rows={rows.filter((r) => picks.overall.slice(0, 3).some((p) => p.row.id === r.id))} vocab={vocab} detail={detail} />
              </Suspense>
            </CareerSection>
          ) : null}

          {!full ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-rule-strong p-10 text-center">
              <p className="text-h3 font-medium text-ink">
                The full Career map
              </p>
              <p className="max-w-[48ch] text-body text-ink-2">
                {LOCKED_TEXT.map} Included in the full report.
              </p>
            </div>
          ) : null}

          {full && picks.corporate.length ? (
            <CareerSection
              index="03"
              label="Corporate"
              id="corporate-h"
              title="Corporate careers"
              lead="Your next five best fits inside companies and professional firms, after your top five."
            >
              <ol className="flex flex-col gap-2">
                {picks.corporate.map((p, i) => (
                  <CareerRow key={p.row.id} p={p} rank={i + 1} index={i} />
                ))}
              </ol>
            </CareerSection>
          ) : null}

          {full && picks.ownPath.length ? (
            <CareerSection
              index="04"
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

          {full ? (
            <CareerSection
              index="05"
              label="Overview"
              id="split-h"
              title="Your whole map"
              lead="How every career path sorts for you, and the ones you told us about."
            >
              <LaneSummary rows={rows} />
            </CareerSection>
          ) : null}

          {full ? (
            <CareerSection
              index="06"
              label="Explore"
              id="all-h"
              title="All career paths"
              lead="Filter by how you'd work, how it pays and how you get in. Open any career path for its roles, day-to-day work and where you'd start."
            >
              <Suspense fallback={<Skeleton lines={8} />}>
                <LaneMap rows={rows} vocab={vocab} detail={detail} />
              </Suspense>
            </CareerSection>
          ) : null}
        </div>
        <OnetAttribution className="mt-20" />
      </div>
    </AppPage>
  );
}
