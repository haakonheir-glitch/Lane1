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
import type { ProfileScores } from "@/lib/scoring/profile";
import type { CareerPick } from "@/lib/lanes/types";
import type { StoredWrittenReport as Written } from "@/lib/report/schema";
import type { WorkBest } from "@/lib/workdesign/best";
import { effortLine, type Effort } from "@/lib/data/effort";
import { formatIsoDot, pad2 } from "@/lib/format";
import { summarise } from "@/lib/view/profile";
import { chapterTitles } from "@/lib/view/chapters";
import { connections } from "@/lib/view/connections";
import { LOCKED_TEXT, type ReportTier } from "@/lib/tier";
import { Cover } from "./Cover";
import { SummarySheet } from "./SummarySheet";
import { Chapter } from "./Chapter";
import { ChapterRail, type RailItem } from "./ChapterRail";
import { MethodChapter } from "./MethodChapter";
import { WorkBestBody } from "./WorkBestBody";
import { CareerPathsBody } from "./CareerPathsBody";
import { OutcomeOptIn } from "@/components/outcome/OutcomeOptIn";

export type ReportDocumentProps = {
  profile: ProfileScores;
  person: { name: string; reportId: string };
  picks: CareerPick[];
  /** "How you work best" (chapter 01); null when the profile has no Work Design data. */
  workBest: WorkBest | null;
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
  /** The person's own report only: the outcome check-in opt-in at the end (ISO dates). */
  outcome?: { consentedAt: string | null; next: string | null; due: boolean } | null;
};

/** The whole report as a document: cover, summary sheet, chapters, method and limits. */
/** Chapter 01's headline: the archetype blend in words (a metaphor, so it names, never types). */
function workBestTitle(wb: WorkBest | null): string {
  const a = wb?.archetype;
  if (!a) return "How you work best";
  const [x, y] = a.top2;
  return a.tentative || a.caveat ? `You sit between ${x!.archetype} and ${y!.archetype}` : `Mostly ${x!.archetype}, with ${y!.archetype} close behind`;
}

export function ReportDocument({ profile, person, picks, workBest, effort, written, own, tier, reportConfigured = false, mode = "screen", status, reveal, outcome }: ReportDocumentProps) {
  const print = mode === "print";
  const full = tier === "full";
  const lastSession = profile.sessions.filter((s) => s.completedAt).map((s) => s.completedAt!).sort().pop();
  const normed = profile.norms.status === "provisional";
  // Locked chapters show their name, not their finding.
  const titles = full ? chapterTitles(profile) : { interests: "Interests", values: "Work values", personality: "Personality", reasoning: "Reasoning", behaviour: "Behaviour tasks" };
  // Reports before REPORT_FORMAT 4 called the career paths section "lanes".
  const words = (id: string) => (written ? written.report.sections.find((s) => s.id === id || (id === "careers" && (s.id as string) === "lanes"))?.paragraphs : null);
  const answered = (xs: { answered: number }[]) => xs.reduce((n, x) => n + x.answered, 0);
  // The sheet's three lines: interests, personality and reasoning (values and paths have their own place on it).
  const brief = summarise(profile).filter((_, i, all) => all.length <= 3 || i !== 1);
  const lowConfidence = profile.sessions.filter((s) => s.confidence === "low");
  const hasAnalysis = own || !!written;
  // The answer first (how you work best, where that work exists), then the scores as the evidence behind it.
  const order = [
    { id: "workbest", title: "How you work best" },
    { id: "careers", title: "Where this work exists" },
    { id: "interests", title: "Interests" },
    { id: "values", title: "Work values" },
    { id: "personality", title: "Personality" },
    { id: "reasoning", title: "Reasoning" },
    { id: "behaviour", title: "Behaviour tasks" },
    ...(hasAnalysis ? [{ id: "analysis", title: "Written analysis" }] : []),
    { id: "method", title: "Method and limits" },
  ];
  const chapters: RailItem[] = order.map((c, i) => ({ ...c, n: pad2(i + 1), locked: !full && c.id !== "method" ? true : undefined }));
  const n = (id: string) => chapters.find((c) => c.id === id)!.n;
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

      <Chapter id="workbest" n={n("workbest")} kicker="How you work best · Work Design model (provisional)" title={full ? workBestTitle(workBest) : "How you work best"} words={words("workbest")} locked={lock("workbest")}>
        {workBest && workBest.modes.some((m) => m.value !== null) ? (
          <WorkBestBody
            wb={workBest}
            workday={written?.report.bestWorkday}
            workdayEmpty={
              <p className="text-body text-ink-2">
                {written
                  ? "Your best workday couldn't be written to the standard this time (every sentence must trace to your results), so it is left out. It is tried again when your written report next updates."
                  : own
                    ? "Your best workday is written by Claude from these results once you ask for the written report (in the Written analysis chapter)."
                    : "In a real report, Claude describes the person's best workday here, from these results only."}
              </p>
            }
          />
        ) : (
          <EmptyState title="Not done yet." body="Sessions S1 and S2 unlock this chapter." action={<ButtonLink href="/assess" size="sm">Open assessment</ButtonLink>} />
        )}
      </Chapter>

      <Chapter id="careers" n={n("careers")} kicker="Career paths · O*NET® occupational data" title="Where this work exists" words={words("careers")} locked={lock("careers")}>
        {picks.length ? <CareerPathsBody picks={picks} connections={connections(profile, picks.slice(0, 5))} print={print} /> : <EmptyState title="Not done yet." body="Sessions S1 and S2 unlock your career paths." />}
      </Chapter>

      <Chapter id="interests" n={n("interests")} kicker="Interests · O*NET® Interest Profiler" title={titles.interests} words={words("interests")} locked={lock("interests")}>
        {profile.interests ? (
          <>
            <InterestPanel interests={profile.interests} />
            <MethodNote parts={[`${answered(profile.interests.scales)} items`, "six areas, 10–50 each", normed ? "published norms" : "compared with your own average"]} />
          </>
        ) : (
          <EmptyState title="Not done yet." body="Session S1 unlocks this chapter." action={<ButtonLink href="/assess/S1" size="sm">Start S1</ButtonLink>} />
        )}
      </Chapter>

      <Chapter id="values" n={n("values")} kicker="Work values · O*NET® Work Importance Locator" title={titles.values} words={words("values")} locked={lock("values")}>
        {profile.values ? <ValuesList values={profile.values} /> : <EmptyState title="Not done yet." body="Session S1 unlocks this chapter." />}
      </Chapter>

      <Chapter id="personality" n={n("personality")} kicker="Personality · IPIP-NEO-120 + Honesty-Humility" title={titles.personality} words={words("personality")} locked={lock("personality")}>
        {profile.personality ? (
          <>
            <ScaleTable domains={profile.personality.domains} facets={profile.personality.facets} extra={profile.personality.honestyHumility} />
            <MethodNote parts={[`${answered(profile.personality.facets) + (profile.personality.honestyHumility?.answered ?? 0)} items`, "90% ranges", "open a row for its facets (wide ranges: hints only)"]} />
          </>
        ) : (
          <EmptyState title="Not done yet." body="Session S2 unlocks this chapter." action={<ButtonLink href="/assess/S2" size="sm">Start S2</ButtonLink>} />
        )}
      </Chapter>

      <Chapter id="reasoning" n={n("reasoning")} kicker="Reasoning · generated tasks · provisional norms" title={titles.reasoning} words={words("reasoning")} locked={lock("reasoning")}>
        {profile.reasoning ? (
          <ReasoningProfile reasoning={profile.reasoning} />
        ) : (
          <EmptyState title="Not done yet." body="Sessions S3 and S4 together unlock this chapter." action={<ButtonLink href="/assess" size="sm">Open assessment</ButtonLink>} />
        )}
      </Chapter>

      <Chapter id="behaviour" n={n("behaviour")} kicker="Behaviour tasks" title={titles.behaviour} words={words("behaviour")} locked={lock("behaviour")}>
        {profile.behaviour ? <BehaviourSummary behaviour={profile.behaviour} /> : <EmptyState title="Not done yet." body="Session S4 unlocks this chapter." />}
      </Chapter>

      {hasAnalysis ? (
        <Chapter id="analysis" n={n("analysis")} kicker="Written analysis · Claude" title={written && full ? written.report.headline : "Your profile, in words"} locked={lock("analysis")}>
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

      <MethodChapter n={n("method")} profile={profile} />

      {own && outcome && !print ? (
        <section aria-labelledby="outcome-h" className="doc-screen border border-paper-edge bg-paper p-8 sm:p-12">
          <p className="text-small text-ink-3">Outcome check-in · optional</p>
          <h2 id="outcome-h" className="mt-3 text-h3 font-medium text-ink">
            Two questions in 6 and 12 months
          </h2>
          <div className="mt-4 max-w-[760px]">
            <OutcomeOptIn {...outcome} />
          </div>
        </section>
      ) : null}
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
