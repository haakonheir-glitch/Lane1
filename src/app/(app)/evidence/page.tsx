import type { Metadata } from "next";
import { AppPage } from "@/components/shell/AppPage";
import { SectionHeader } from "@/components/report/SectionHeader";
import { ConfidenceBadge } from "@/components/data/ConfidenceBadge";
import { EvidenceTimeline, TimelineLegend } from "@/components/evidence/EvidenceTimeline";
import { ConvictionChart } from "@/components/evidence/ConvictionChart";
import { LaneComparisonTable, buildComparisonRows } from "@/components/evidence/LaneComparisonTable";
import { confidenceLabel, formatIsoDot } from "@/lib/format";
import { getEvidence, getLanes, getSprints, getToday } from "@/lib/data";

export const metadata: Metadata = { title: "Evidence Record" };

export default async function EvidencePage() {
  const [evidence, lanes, sprints] = await Promise.all([getEvidence(), getLanes(), getSprints()]);
  const laneNames = Object.fromEntries(lanes.map((l) => [l.id, l.name]));
  const rows = buildComparisonRows(sprints, lanes);
  const today = getToday();

  return (
    <AppPage title="Evidence Record" meta={`${evidence.events.length} entries · as of ${formatIsoDot(today)}`}>
      <div className="max-w-content">
        <p className="label text-ink-3">Evidence · Record</p>
        <div className="mt-4 max-w-[840px]">
          <h1 className="text-h2 font-medium text-ink">{evidence.headline}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <p className="text-body-l text-ink-2">Confidence: {confidenceLabel[evidence.confidence]}.</p>
            <ConfidenceBadge level={evidence.confidence} />
          </div>
          <p className="mt-4 max-w-reading text-small text-ink-3">
            Conviction combines your profile prior with sprint outcomes: performance, improvement rate, energy and whether
            you wanted to continue. It is reported with an interval and will move as you try more.
          </p>
        </div>

        <section className="mt-16" aria-labelledby="record-h">
          <SectionHeader index="01" label="Record" title="Conviction over time" id="record-h" aside="0–100 · shaded = 80% interval" />
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7 lg:order-2">
              <div className="lg:sticky lg:top-20">
                <ConvictionChart series={evidence.conviction} laneNames={laneNames} height={300} />
                <p className="mt-4 text-small text-ink-3">
                  Lines start at the profile prior on {formatIsoDot(evidence.conviction[0]?.points[0]?.date ?? today)}. Flat
                  segments mean no new evidence for that lane.
                </p>
              </div>
            </div>
            <div className="lg:col-span-5 lg:order-1">
              <TimelineLegend />
              <div className="mt-6 border-t border-rule pt-2">
                <EvidenceTimeline events={evidence.events} laneNames={laneNames} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20" aria-labelledby="compare-h">
          <SectionHeader index="02" label="Comparison" title="Every lane you've tried" id="compare-h" />
          <LaneComparisonTable rows={rows} />
          <p className="mt-4 max-w-reading text-small text-ink-3">
            Performance is scored against people at the same stage of the same sprint, not against professionals.
            Improvement is the change from the first third of a sprint to the last.
          </p>
        </section>
      </div>
    </AppPage>
  );
}
