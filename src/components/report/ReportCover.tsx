import type { ReactNode } from "react";
import type { ProfileScores } from "@/lib/scoring/profile";
import { basisLine, keyFigures } from "@/lib/view/findings";
import { SessionStrip } from "./SessionStrip";
import { cn } from "@/lib/cn";

/**
 * The report's cover, like the first page of a lab report: who and when, the four headline
 * figures with what each rests on, how far the profile has been built, and what it is
 * compared with. Everything here is read from computed scores.
 */
export function ReportCover({
  profile,
  subject,
  reportId,
  updated,
  note,
}: {
  profile: ProfileScores;
  subject: string;
  reportId: string;
  updated: string;
  /** Sample marker, if any: shown in the metadata line. */
  note?: ReactNode;
}) {
  const figures = keyFigures(profile);
  return (
    <header>
      <p className="label text-ink-3">
        Profile report <span className="px-1.5 text-ink-4">·</span> {reportId} <span className="px-1.5 text-ink-4">·</span> Updated {updated}
        <span className="px-1.5 text-ink-4">·</span> {profile.scoringVersion}
        {note}
      </p>
      <h1 className="mt-5 text-display font-medium text-ink">{subject}</h1>

      <dl className="mt-12 grid grid-cols-2 border-t border-ink lg:grid-cols-4">
        {figures.map((f, i) => (
          <div
            key={f.id}
            className={cn(
              "flex min-w-0 flex-col pt-4 pr-6 pb-6",
              i > 0 && "lg:border-l lg:border-rule lg:pl-6",
              i % 2 === 1 && "border-l border-rule pl-6 lg:pl-6",
              i >= 2 && "border-t border-rule lg:border-t-0",
            )}
          >
            <dt className="label text-ink-3">{f.label}</dt>
            <dd className="mt-5 flex flex-1 flex-col">
              <span
                className={cn(
                  "font-medium tracking-[-0.015em] [overflow-wrap:anywhere] [word-break:normal]",
                  f.value === null ? "text-ink-4" : "text-ink",
                  // Words get a step smaller below 1400 px so "Conscientiousness" fits a quarter column.
                  f.id === "interests" || f.id === "reasoning" ? "font-mono text-[28px] leading-[34px] tabular min-[1400px]:text-figure" : "text-[24px] leading-[30px] min-[1400px]:text-figure",
                )}
              >
                {f.value ?? "—"}
              </span>
              <span className="mt-2 text-small text-ink-2">{f.detail}</span>
              <span className="mt-auto pt-5 label text-ink-3">{f.source}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-4 border-y border-rule py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <SessionStrip sessions={profile.sessions} className="lg:w-[420px]" />
        <p className="text-small text-ink-2 lg:text-right">{basisLine(profile)}</p>
      </div>
    </header>
  );
}
