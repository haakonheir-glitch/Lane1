import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { ReportDocument } from "@/components/report/doc/ReportDocument";
import { Directions } from "@/components/lanes/Directions";
import { groupDirections } from "@/lib/lanes/types";
import { getSampleReport } from "@/lib/data/sample-report";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Sample report",
  description: `A complete ${BRAND.name} Career Profile for a fictional person: cover, summary sheet, every chapter, the Career map and the method.`,
  alternates: { canonical: "/sample" },
};

/** The main marketing asset: a full report, built by the real report components from a fictional profile. */
export default async function SamplePage() {
  const { profile, picks, workBest, person, effort } = await getSampleReport();
  return (
    <div className="page pt-12 pb-24 sm:pt-16">
      <div className="mb-10 flex flex-col gap-6 border-b border-rule pb-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-small text-ink-3">Sample report · fictional person</p>
          <h1 className="mt-3 text-h1 font-medium text-ink">This is what you get.</h1>
          <p className="mt-3 max-w-reading text-body-l text-ink-2">
            A complete Career Profile for a sample person, made by the same components as yours. Every number on it comes from the sample&apos;s scores.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <ButtonLink href="/signup">Start your profile</ButtonLink>
          <ButtonLink href="/sample/print" variant="secondary">
            Download PDF
          </ButtonLink>
        </div>
      </div>
      <ReportDocument profile={profile} person={person} picks={picks} workBest={workBest} effort={effort} written={null} own={false} tier="full" />
      <section aria-labelledby="map-h" className="mt-8 border border-paper-edge bg-paper p-8 sm:p-12">
        <p className="text-small text-ink-3">Career map · excerpt</p>
        <h2 id="map-h" className="mt-3 text-h2 font-medium text-ink">
          The sample&apos;s directions
        </h2>
        <p className="mt-2 max-w-reading text-body text-ink-2">In your own Career map, each opens to its day-to-day work, how people get in and where you&apos;d start.</p>
        <Directions directions={groupDirections(picks)} linked={false} className="mt-6" />
      </section>
      <div className="mt-12 flex flex-wrap items-center gap-4">
        <ButtonLink href="/signup">Start your profile</ButtonLink>
        <span className="text-small text-ink-3">Free during the pilot · no card</span>
      </div>
    </div>
  );
}
