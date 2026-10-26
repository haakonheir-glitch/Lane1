import type { Metadata } from "next";
import { AppPage } from "@/components/shell/AppPage";
import { ReportCover } from "@/components/report/ReportCover";
import { MethodNote } from "@/components/report/MethodNote";
import { SectionHeader } from "@/components/report/SectionHeader";
import { LimitationsBox } from "@/components/report/LimitationsBox";
import { SampleBanner } from "@/components/report/SampleBanner";
import { OnetAttribution } from "@/components/report/OnetAttribution";
import { ScaleTable } from "@/components/results/ScaleTable";
import { InterestPanel } from "@/components/results/InterestPanel";
import { ValuesList } from "@/components/results/ValuesList";
import { ReasoningProfile } from "@/components/results/ReasoningProfile";
import { BehaviourSummary } from "@/components/results/BehaviourSummary";
import { EmptyState } from "@/components/report/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { formatIsoDot, pad2 } from "@/lib/format";
import { LIMITATIONS, summarise } from "@/lib/view/profile";
import { getMyReport, getProfileView, getSampleUser, getTopCareerPaths, getUser } from "@/lib/data";
import { WrittenReport } from "@/components/report/WrittenReport";
import { WriteReportForm } from "@/components/report/WriteReportForm";
import { basisLine, findings, reasoningTitle } from "@/lib/view/findings";
import { Charted } from "@/components/report/Charted";

export const metadata: Metadata = { title: "Profile report" };

export default async function ProfilePage() {
  const [{ profile, source }, me, sample, written, topPaths] = await Promise.all([getProfileView(), getUser(), getSampleUser(), getMyReport(), getTopCareerPaths()]);
  const own = source === "own";
  const reportConfigured = !!process.env.ANTHROPIC_API_KEY;
  const person = own ? me : sample;
  // Before population norms exist, scores are relative to the person's own other scores.
  const normed = profile.norms.status === "provisional";
  const lastSession = profile.sessions.filter((s) => s.completedAt).map((s) => s.completedAt!).sort().pop();
  const lowConfidence = profile.sessions.filter((s) => s.confidence === "low");
  const lead = findings(profile);
  const answered = (xs: { answered: number }[]) => xs.reduce((n, x) => n + x.answered, 0);
  // The written report's paragraph for each charted section, shown beside the chart.
  const words = (id: string) => written?.report.sections.find((s) => s.id === id)?.paragraphs;
  const stale = !!written?.stale;

  return (
    <AppPage
      title="Profile report"
      meta={own ? person.reportId : `${person.reportId} · sample`}
      action={
        <ButtonLink href="/lanes" variant="secondary" size="sm">
          Open Career map
        </ButtonLink>
      }
    >
      <article className="max-w-content">
        {own ? null : <SampleBanner className="mb-10" />}
        <ReportCover
          profile={profile}
          subject={person.name}
          reportId={person.reportId}
          updated={lastSession ? formatIsoDot(lastSession) : "—"}
          note={own ? <span className="ml-4 text-positive">Your results</span> : null}
        />
        {profile.completeness.partial ? (
          <p className="mt-4 text-small text-ink-2">
            <span className="label text-caution">Still to come</span>
            <span className="ml-3">{profile.completeness.missing.join(" · ")}</span>
          </p>
        ) : null}
        {lowConfidence.length ? (
          <div className="mt-6 rounded-sm border border-caution/50 bg-surface p-6">
            <p className="label text-caution">Low confidence</p>
            <p className="mt-2 text-small text-ink-2">
              {lowConfidence.map((s) => `${s.id}: ${s.flags.join("; ")}`).join(" · ")}. You can retake these sessions from the assessment page.
            </p>
          </div>
        ) : null}

        <section className="mt-16" aria-labelledby="summary-h">
          <SectionHeader index="01" label="Summary" title="In brief" id="summary-h" />
          <ol className="flex max-w-[840px] flex-col gap-5">
            {summarise(profile, topPaths).map((s, i) => (
              <li key={i} className="grid grid-cols-[32px_1fr] gap-2 text-body-l text-ink">
                <span className="pt-1 font-mono text-small text-ink-3">{pad2(i + 1)}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20" aria-labelledby="interests-h">
          <SectionHeader index="02" label="Interests · O*NET® Interest Profiler" title="What kind of work draws you" id="interests-h" aside={normed ? "Raw 10–50 · T with 90% interval" : "Raw 10–50 · compared with your own average"} finding={lead.interests} />
          {profile.interests ? (
            <Charted text={words("interests")} stale={stale}>
              <InterestPanel interests={profile.interests} />
              <MethodNote parts={["O*NET Interest Profiler Short Form", `${answered(profile.interests.scales)} items`, "six RIASEC areas, 10–50 each", normed ? "published norms" : "compared with your own average"]} />
            </Charted>
          ) : (
            <EmptyState title="Not done yet." body="Session S1 unlocks this section." action={<ButtonLink href="/assess/S1" size="sm">Start S1</ButtonLink>} />
          )}
        </section>

        <section className="mt-20" aria-labelledby="values-h">
          <SectionHeader index="03" label="Work values · O*NET® Work Importance Locator" title="What you want work to give you" id="values-h" aside="From your card sort" finding={lead.values} />
          {profile.values ? (
            <Charted text={words("values")} stale={stale}>
              <ValuesList values={profile.values} />
              <MethodNote parts={["O*NET Work Importance Locator", "forced card sort", "six values ranked by weighted placement", "within-person ranking"]} />
            </Charted>
          ) : (
            <EmptyState title="Not done yet." body="Session S1 unlocks this section." />
          )}
        </section>

        <section className="mt-20" aria-labelledby="personality-h">
          <SectionHeader index="04" label="Personality · IPIP-NEO-120 + Honesty-Humility" title="How you tend to work" id="personality-h" aside={normed ? "Tick = population median · open a row for facets" : "Tick = your own average · open a row for facets"} finding={lead.personality} />
          {profile.personality ? (
            <Charted text={words("personality")} stale={stale}>
              <ScaleTable domains={profile.personality.domains} facets={profile.personality.facets} extra={profile.personality.honestyHumility} />
              <MethodNote
                parts={[
                  "IPIP-NEO-120 + Honesty-Humility",
                  `${answered(profile.personality.facets) + (profile.personality.honestyHumility?.answered ?? 0)} items`,
                  "five domains, 30 facets",
                  "90% intervals",
                  normed ? "published norms" : "compared with your own average",
                ]}
              />
              <p className="mt-3 max-w-reading text-small text-ink-3">
                Facets have only four items each, so their intervals are wide; read them as hints, never decide anything from a single facet. Openness is
                scored from five facets (the political-attitudes facet is not used).
              </p>
            </Charted>
          ) : (
            <EmptyState title="Not done yet." body="Session S2 unlocks this section." action={<ButtonLink href="/assess/S2" size="sm">Start S2</ButtonLink>} />
          )}
        </section>

        <section className="mt-20" aria-labelledby="reasoning-h">
          <SectionHeader index="05" label="Reasoning · generated tasks" title={reasoningTitle(profile)} id="reasoning-h" aside="Provisional norms · adults 18–35" finding={lead.reasoning} />
          {profile.reasoning ? (
            <Charted text={words("reasoning")} stale={stale}>
              <ReasoningProfile reasoning={profile.reasoning} />
              <MethodNote parts={["Generated items, 5 timed tasks", "3PL ability estimate, 90% range", "provisional difficulty table", "rapid guesses left out"]} />
            </Charted>
          ) : (
            <EmptyState title="Not done yet." body="Sessions S3 and S4 together unlock your reasoning profile." action={<ButtonLink href="/assess" size="sm">Open assessment</ButtonLink>} />
          )}
        </section>

        {profile.behaviour ? (
          <section className="mt-20" aria-labelledby="behaviour-h">
            <SectionHeader index="06" label="Behaviour tasks" title="Learning, risk and patience" id="behaviour-h" />
            <Charted text={words("behaviour")} stale={stale}>
              <BehaviourSummary behaviour={profile.behaviour} />
            </Charted>
          </section>
        ) : null}

        {own ? (
          <section className="mt-20" aria-labelledby="analysis-h">
            <SectionHeader index="07" label="Written report · Claude" title="The full analysis" id="analysis-h" aside="Written from the scores on this page" />
            {written ? (
              <>
                {written.stale ? (
                  <div className="mb-8 rounded-sm border border-rule-strong bg-surface p-5">
                    <p className="label text-caution">Out of date</p>
                    <p className="mt-2 text-small text-ink-2">Your scores have changed since this report was written (for example, a new session).</p>
                    <div className="mt-4">
                      <WriteReportForm label="Rewrite my report" configured={reportConfigured} />
                    </div>
                  </div>
                ) : null}
                <details className="group max-w-[840px] border-y border-rule-strong">
                  <summary className="flex cursor-pointer list-none items-center gap-3 py-4 text-body text-ink [&::-webkit-details-marker]:hidden">
                    <span aria-hidden className="font-mono text-small text-ink-3 transition-quiet group-open:rotate-90">
                      ›
                    </span>
                    Read the full analysis
                    <span className="ml-auto truncate text-small text-ink-3">{written.report.headline}</span>
                  </summary>
                  <div className="pt-4 pb-8">
                    <WrittenReport report={written.report} model={written.model} createdAt={written.createdAt} />
                  </div>
                </details>
              </>
            ) : (
              <div className="max-w-[840px] border-l-2 border-ink pl-6">
                <p className="text-body-l text-ink">
                  Turn the scores on this page into a written report: what your interests, values and personality add up to, why your closest career
                  paths fit, and what the results can&apos;t tell you. Each part appears beside its chart, with the full analysis here.
                </p>
                <p className="mt-2 text-small text-ink-3">
                  The app does all the scoring; Claude only explains the results, and a check rejects any report that cites a figure not in your scores.
                  Written once and saved; rewritten only when your scores change.
                </p>
                <div className="mt-6">
                  <WriteReportForm configured={reportConfigured} />
                </div>
              </div>
            )}
          </section>
        ) : null}

        <section className="mt-20" aria-labelledby="limits-h">
          <SectionHeader index={own ? "08" : "07"} label="Read this" title="What this can and can't tell you" id="limits-h" />
          <div className="max-w-[840px]">
            <LimitationsBox
              title="A profile is a map, not a verdict."
              items={LIMITATIONS}
              footer="Lane's own experimental scales (extra interests and values, work dispositions, emotion judgement, idea tasks and life history) are collected but not shown until a pilot validates them."
            />
          </div>
        </section>

        <section className="mt-20" aria-labelledby="appendix-h">
          <SectionHeader label="Appendix" title="Method" id="appendix-h" as="h3" />
          <dl className="grid max-w-[840px] gap-x-8 gap-y-3 text-small sm:grid-cols-[160px_1fr]">
            <dt className="label text-ink-3">Scoring version</dt>
            <dd className="font-mono text-ink-2">{profile.scoringVersion}</dd>
            <dt className="label text-ink-3">Compared with</dt>
            <dd className="text-ink-2">{basisLine(profile)}</dd>
            <dt className="label text-ink-3">More</dt>
            <dd className="text-ink-2">
              <a href="/method" className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
                How Lane works, with references
              </a>
            </dd>
          </dl>
        </section>

        <OnetAttribution className="mt-20" />
      </article>
    </AppPage>
  );
}
