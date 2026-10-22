import type { Metadata } from "next";
import { AppPage } from "@/components/shell/AppPage";
import { SectionHeader } from "@/components/report/SectionHeader";
import { EmptyState } from "@/components/report/EmptyState";
import { ConfidenceBadge } from "@/components/data/ConfidenceBadge";
import { ButtonLink } from "@/components/ui/Button";
import { EvidenceTimeline, TimelineLegend } from "@/components/evidence/EvidenceTimeline";
import { ConvictionChart } from "@/components/evidence/ConvictionChart";
import { LaneComparisonTable, buildComparisonRows } from "@/components/evidence/LaneComparisonTable";
import { confidenceLabel, formatIsoDot } from "@/lib/format";
import { getEvidence, getLaneName, getSprints, getToday } from "@/lib/data";
import { SampleBanner } from "@/components/report/SampleBanner";

export const metadata: Metadata = { title: "Evidence Record" };

export default async function EvidencePage() {
  const [evidence, sprints] = await Promise.all([getEvidence(), getSprints()]);
  const laneIds = new Set([...sprints.map((s) => s.laneId), ...(evidence?.events.flatMap((e) => (e.laneId ? [e.laneId] : [])) ?? []), ...(evidence?.conviction.map((c) => c.laneId) ?? [])]);
  const laneNames = Object.fromEntries([...laneIds].map((id) => [id, getLaneName(id)]));
  const rows = buildComparisonRows(sprints, laneNames);
  const today = getToday();
  const hasSeries = (evidence?.conviction.length ?? 0) > 0 && (evidence?.conviction[0]?.points.length ?? 0) > 1;

  return (
    <AppPage title="Evidence Record" meta={`${evidence?.events.length ?? 0} entries · as of ${formatIsoDot(today)}`}>
      <div className="max-w-content">
        <SampleBanner what="evidence records" className="mb-10" />
        <p className="label text-ink-3">Evidence · Record</p>
        {!evidence ? (
          <div className="mt-8">
            <EmptyState
              title="Nothing recorded yet."
              body="Your record starts when you finish your first assessment module, and grows with every sprint."
              action={<ButtonLink href="/assess">Start the assessment</ButtonLink>}
            />
          </div>
        ) : (
          <>
            <div className="mt-4 max-w-[840px]">
              <h1 className="text-h2 font-medium text-ink">{evidence.headline}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                <p className="text-body-l text-ink-2">Confidence: {confidenceLabel[evidence.confidence]}.</p>
                <ConfidenceBadge level={evidence.confidence} />
              </div>
              <p className="mt-4 max-w-reading text-small text-ink-3">
                Conviction starts at your profile&apos;s relative fit for a lane and moves with sprint evidence: desire to
                continue, energy, flow and rate of improvement. It carries an interval that narrows as evidence accumulates.
              </p>
            </div>

            <section className="mt-16" aria-labelledby="record-h">
              <SectionHeader index="01" label="Record" title="Conviction over time" id="record-h" aside="0–100 · shaded = 80% interval" />
              <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
                <div className="lg:order-2 lg:col-span-7">
                  <div className="lg:sticky lg:top-20">
                    {hasSeries ? (
                      <>
                        <ConvictionChart series={evidence.conviction} laneNames={laneNames} height={300} />
                        <p className="mt-4 text-small text-ink-3">Flat segments mean no new evidence for that lane.</p>
                      </>
                    ) : (
                      <EmptyState
                        title="No conviction line yet."
                        body="Lines appear once you have started a sprint and checked in at least once."
                        action={<ButtonLink href="/sprints" variant="secondary" size="sm">Go to sprints</ButtonLink>}
                      />
                    )}
                  </div>
                </div>
                <div className="lg:order-1 lg:col-span-5">
                  <TimelineLegend />
                  <div className="mt-6 border-t border-rule pt-2">
                    <EvidenceTimeline events={evidence.events} laneNames={laneNames} />
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-20" aria-labelledby="compare-h">
              <SectionHeader index="02" label="Comparison" title="Every lane you've tried" id="compare-h" />
              {rows.length ? (
                <>
                  <LaneComparisonTable rows={rows} />
                  <p className="mt-4 max-w-reading text-small text-ink-3">
                    Performance is a percentile against others who ran the same sprint, shown once ten people have.
                    Improvement is the change from the first third of your logged days to the last.
                  </p>
                </>
              ) : (
                <EmptyState title="No lanes tried yet." body="Each sprint you run adds a row here." />
              )}
            </section>
          </>
        )}
      </div>
    </AppPage>
  );
}
