import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/report/EmptyState";
import { MethodNote } from "@/components/report/MethodNote";
import { WrittenReport } from "@/components/report/WrittenReport";
import { WriteReportForm } from "@/components/report/WriteReportForm";
import { InterestPanel } from "@/components/results/InterestPanel";
import { ValuesList } from "@/components/results/ValuesList";
import { ScaleTable } from "@/components/results/ScaleTable";
import { ReasoningProfile } from "@/components/results/ReasoningProfile";
import { BehaviourSummary } from "@/components/results/BehaviourSummary";
import { TraitConnections } from "@/components/lanes/TraitConnections";
import type { ProfileScores } from "@/lib/scoring/profile";
import type { CareerPick } from "@/lib/lanes/types";
import type { WrittenReport as Written } from "@/lib/report/schema";
import { effortLine, type Effort } from "@/lib/data/effort";
import { formatIsoDot } from "@/lib/format";
import { summarise } from "@/lib/view/profile";
import { chapterTitles } from "@/lib/view/chapters";
import { connections } from "@/lib/view/connections";
import { LOCKED_TEXT, type ReportTier } from "@/lib/tier";
import { Cover } from "./Cover";
import { SummarySheet } from "./SummarySheet";
import { Chapter } from "./Chapter";
import { ChapterRail, type RailItem } from "./ChapterRail";
import { MethodChapter } from "./MethodChapter";

export type ReportDocumentProps = {
  profile: ProfileScores;
  person: { name: string; reportId: string };
  picks: CareerPick[];
  effort: Effort;
  written: { report: Written; model: string; createdAt: Date } | null;
  /** The signed-in person's own report (shows the written-analysis chapter and its controls). */
  own: boolean;
  tier: ReportTier;
  reportConfigured?: boolean;
  /** "print" drops the rail and interactive parts and opens every disclosure. */
  mode?: "screen" | "print";
  status?: ReactNode;
  reveal?: boolean;
};

/** The whole report as a document: cover, summary sheet, chapters, method and limits. */
export function ReportDocument({ profile, person, picks, effort, written, own, tier, reportConfigured = false, mode = "screen", status, reveal }: ReportDocumentProps) {
  const print = mode === "print";
  const full = tier === "full";
  const lastSession = profile.sessions.filter((s) => s.completedAt).map((s) => s.completedAt!).sort().pop();
  const normed = profile.norms.status === "provisional";
  const titles = chapterTitles(profile);
  const words = (id: string) => (written ? written.report.sections.find((s) => s.id === id)?.paragraphs : null);
  const answered = (xs: { answered: number }[]) => xs.reduce((n, x) => n + x.answered, 0);
  // The sheet's three lines: interests, personality and reasoning (values and paths have their own place on it).
  const brief = summarise(profile).filter((_, i, all) => all.length <= 3 || i !== 1);
  const lowConfidence = profile.sessions.filter((s) => s.confidence === "low");
  const hasAnalysis = own || !!written;
  const chapters: RailItem[] = [
    { id: "interests", n: "01", title: "Interests" },
    { id: "values", n: "02", title: "Work values" },
    { id: "personality", n: "03", title: "Personality" },
    { id: "reasoning", n: "04", title: "Reasoning" },
    { id: "behaviour", n: "05", title: "Behaviour tasks" },
    { id: "fit", n: "06", title: "Your career fit" },
    ...(hasAnalysis ? [{ id: "analysis", n: "07", title: "Written analysis" }] : []),
    { id: "method", n: hasAnalysis ? "08" : "07", title: "Method and limits" },
  ].map((c) => ({ ...c, locked: !full && c.id !== "method" ? true : undefined }));
  const rail: RailItem[] = [{ id: "cover", n: "—", title: "Cover" }, { id: "summary", n: "—", title: "Summary" }, ...chapters];
  const lock = (id: string) => (!full && id !== "method" ? `${LOCKED_TEXT[id]} Included in the full report.` : undefined);

  const article = (
    <article className="doc flex min-w-0 flex-col gap-8">
      <Cover
        profile={profile}
        name={person.name}
        reportId={person.reportId}
        date={lastSession ? formatIsoDot(lastSession) : "—"}
        effort={effortLine(effort)}
        status={status}
        reveal={reveal}
      />
      {profile.completeness.partial ? (
        <p className="doc-screen text-small text-ink-2">
          <span className="text-caution">Still to come:</span> {profile.completeness.missing.join(" · ")}
        </p>
      ) : null}
      {lowConfidence.length ? (
        <p className="doc-screen text-small text-ink-2">
          <span className="text-caution">Low confidence:</span> {lowConfidence.map((s) => `${s.id}: ${s.flags.join("; ")}`).join(" · ")}. You can retake these sessions from the
          assessment page.
        </p>
      ) : null}
      <SummarySheet profile={profile} name={person.name} reportId={person.reportId} paths={picks} brief={brief} />

      <Chapter id="interests" n="01" kicker="Interests · O*NET® Interest Profiler" title={titles.interests} words={words("interests")} locked={lock("interests")}>
        {profile.interests ? (
          <>
            <InterestPanel interests={profile.interests} />
            <MethodNote parts={[`${answered(profile.interests.scales)} items`, "six areas, 10–50 each", normed ? "published norms" : "compared with your own average"]} />
          </>
        ) : (
          <EmptyState title="Not done yet." body="Session S1 unlocks this chapter." action={<ButtonLink href="/assess/S1" size="sm">Start S1</ButtonLink>} />
        )}
      </Chapter>

      <Chapter id="values" n="02" kicker="Work values · O*NET® Work Importance Locator" title={titles.values} words={words("values")} locked={lock("values")}>
        {profile.values ? <ValuesList values={profile.values} /> : <EmptyState title="Not done yet." body="Session S1 unlocks this chapter." />}
      </Chapter>

      <Chapter id="personality" n="03" kicker="Personality · IPIP-NEO-120 + Honesty-Humility" title={titles.personality} words={words("personality")} locked={lock("personality")}>
        {profile.personality ? (
          <>
            <ScaleTable domains={profile.personality.domains} facets={profile.personality.facets} extra={profile.personality.honestyHumility} />
            <MethodNote parts={[`${answered(profile.personality.facets) + (profile.personality.honestyHumility?.answered ?? 0)} items`, "90% ranges", "open a row for its facets (wide ranges: hints only)"]} />
          </>
        ) : (
          <EmptyState title="Not done yet." body="Session S2 unlocks this chapter." action={<ButtonLink href="/assess/S2" size="sm">Start S2</ButtonLink>} />
        )}
      </Chapter>

      <Chapter id="reasoning" n="04" kicker="Reasoning · generated tasks · provisional norms" title={titles.reasoning} words={words("reasoning")} locked={lock("reasoning")}>
        {profile.reasoning ? (
          <ReasoningProfile reasoning={profile.reasoning} />
        ) : (
          <EmptyState title="Not done yet." body="Sessions S3 and S4 together unlock this chapter." action={<ButtonLink href="/assess" size="sm">Open assessment</ButtonLink>} />
        )}
      </Chapter>

      <Chapter id="behaviour" n="05" kicker="Behaviour tasks" title={titles.behaviour} words={words("behaviour")} locked={lock("behaviour")}>
        {profile.behaviour ? <BehaviourSummary behaviour={profile.behaviour} /> : <EmptyState title="Not done yet." body="Session S4 unlocks this chapter." />}
      </Chapter>

      <Chapter id="fit" n="06" kicker="Your career fit" title="How your profile connects to career paths" words={words("lanes")} locked={lock("fit")}>
        <TraitConnections data={connections(profile, picks.slice(0, 5))} />
        <div className="doc-screen mt-8 flex flex-wrap items-center gap-4">
          <ButtonLink href="/lanes">Open your Career map</ButtonLink>
          <span className="text-small text-ink-3">All 205 career paths, with day-to-day work, entry routes, pay and where you&apos;d start.</span>
        </div>
      </Chapter>

      {hasAnalysis ? (
        <Chapter id="analysis" n="07" kicker="Written analysis · Claude" title={written ? written.report.headline : "Your profile, in words"} locked={lock("analysis")}>
          {written ? (
            <details className="group border-y border-rule-strong" open={print || undefined}>
              <summary className="flex cursor-pointer list-none items-center gap-3 py-4 text-body text-ink [&::-webkit-details-marker]:hidden">
                <span aria-hidden className="font-mono text-small text-ink-3 transition-quiet group-open:rotate-90">
                  ›
                </span>
                Read the full analysis
              </summary>
              <div className="pt-4 pb-8">
                <WrittenReport report={written.report} model={written.model} createdAt={written.createdAt} />
              </div>
            </details>
          ) : (
            <div className="max-w-[760px]">
              <p className="text-body-l text-ink">
                Turn the scores in this report into words: what your interests, values and personality add up to, and why your closest career paths
                fit. Each part appears beside its chart, with the full analysis here.
              </p>
              <p className="mt-2 text-small text-ink-3">The app does all the scoring; Claude only explains it. Written once, then kept up to date when your scores change.</p>
              <div className="mt-6">
                <WriteReportForm configured={reportConfigured} />
              </div>
            </div>
          )}
        </Chapter>
      ) : null}

      <MethodChapter n={hasAnalysis ? "08" : "07"} profile={profile} />
    </article>
  );
  if (print) return article;
  return (
    <div className="grid gap-10 xl:grid-cols-[168px_minmax(0,1fr)]">
      <ChapterRail items={rail} className="hidden self-start xl:sticky xl:top-24 xl:block" />
      {article}
    </div>
  );
}
