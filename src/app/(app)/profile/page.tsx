import type { Metadata } from "next";
import { AppPage } from "@/components/shell/AppPage";
import { ReportHeader } from "@/components/report/ReportHeader";
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
import { getProfileView, getSampleUser, getUser } from "@/lib/data";
import { OwnResultsNote } from "@/components/report/OwnResultsNote";

export const metadata: Metadata = { title: "Profile report" };

export default async function ProfilePage() {
  const [{ profile, source }, me, sample] = await Promise.all([getProfileView(), getUser(), getSampleUser()]);
  const own = source === "own";
  const person = own ? me : sample;
  // Before population norms exist, scores are relative to the person's own other scores.
  const normed = profile.norms.status === "provisional";
  const lastSession = profile.sessions.filter((s) => s.completedAt).map((s) => s.completedAt!).sort().pop();
  const lowConfidence = profile.sessions.filter((s) => s.confidence === "low");

  return (
    <AppPage
      title="Profile report"
      meta={own ? person.reportId : `${person.reportId} · sample`}
      action={
        <ButtonLink href="/lanes" variant="secondary" size="sm">
          Open Lane Map
        </ButtonLink>
      }
    >
      <article className="max-w-content">
        {own ? <OwnResultsNote className="mb-10" /> : <SampleBanner className="mb-10" />}
        <ReportHeader
          title={`Profile report · ${profile.scoringVersion}`}
          subject={person.name}
          fields={[
            { label: "Report ID", value: person.reportId },
            { label: "Updated", value: lastSession ? formatIsoDot(lastSession) : "—" },
            { label: "Compared with", value: profile.norms.status === "provisional" ? "Population (provisional norms)" : own ? "Yourself" : "Sample norms" },
            { label: "Holland code", value: profile.interests?.hollandCode ?? "—" },
          ]}
        />

        {profile.completeness.partial ? (
          <div className="mt-10 rounded-sm border border-rule-strong bg-surface p-6">
            <p className="label text-caution">Partial profile</p>
            <p className="mt-2 text-small text-ink-2">Missing: {profile.completeness.missing.join(" · ")}.</p>
          </div>
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
          <SectionHeader index="01" label="Summary" title="In brief" id="summary-h" aside={profile.norms.note} />
          <ol className="flex max-w-[840px] flex-col gap-5">
            {summarise(profile).map((s, i) => (
              <li key={i} className="grid grid-cols-[32px_1fr] gap-2 text-body-l text-ink">
                <span className="pt-1 font-mono text-small text-ink-3">{pad2(i + 1)}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20" aria-labelledby="interests-h">
          <SectionHeader index="02" label="Interests · O*NET® Interest Profiler" title="What kind of work draws you" id="interests-h" aside={normed ? "Raw 10–50 · T with 90% interval" : "Raw 10–50 · compared with your own average"} />
          {profile.interests ? <InterestPanel interests={profile.interests} /> : <EmptyState title="Not done yet." body="Session S1 unlocks this section." action={<ButtonLink href="/assess/S1" size="sm">Start S1</ButtonLink>} />}
        </section>

        <section className="mt-20" aria-labelledby="values-h">
          <SectionHeader index="03" label="Work values · O*NET® Work Importance Locator" title="What you want work to give you" id="values-h" aside="From your card sort" />
          {profile.values ? <ValuesList values={profile.values} /> : <EmptyState title="Not done yet." body="Session S1 unlocks this section." />}
        </section>

        <section className="mt-20" aria-labelledby="personality-h">
          <SectionHeader index="04" label="Personality · IPIP-NEO-120 + Honesty-Humility" title="How you tend to work" id="personality-h" aside={normed ? "Tick = population median · open a row for facets" : "Tick = your own average · open a row for facets"} />
          {profile.personality ? (
            <>
              <ScaleTable domains={profile.personality.domains} facets={profile.personality.facets} extra={profile.personality.honestyHumility} />
              <p className="mt-4 max-w-reading text-small text-ink-3">
                Facets have only four items each, so their intervals are wide; read them as hints, never decide anything from a single facet. Openness is
                scored from five facets (the political-attitudes facet is not used).
              </p>
            </>
          ) : (
            <EmptyState title="Not done yet." body="Session S2 unlocks this section." action={<ButtonLink href="/assess/S2" size="sm">Start S2</ButtonLink>} />
          )}
        </section>

        <section className="mt-20" aria-labelledby="reasoning-h">
          <SectionHeader index="05" label="Reasoning · generated tasks" title="Where your reasoning is relatively strongest" id="reasoning-h" />
          {profile.reasoning ? (
            <ReasoningProfile reasoning={profile.reasoning} />
          ) : (
            <EmptyState title="Not done yet." body="Sessions S3 and S4 together unlock your reasoning profile." action={<ButtonLink href="/assess" size="sm">Open assessment</ButtonLink>} />
          )}
        </section>

        {profile.behaviour ? (
          <section className="mt-20" aria-labelledby="behaviour-h">
            <SectionHeader index="06" label="Behaviour tasks" title="Learning, risk and patience" id="behaviour-h" />
            <BehaviourSummary behaviour={profile.behaviour} />
          </section>
        ) : null}

        <section className="mt-20" aria-labelledby="limits-h">
          <SectionHeader index="07" label="Read this" title="What this can and can't tell you" id="limits-h" />
          <div className="max-w-[840px]">
            <LimitationsBox
              title="A profile is a starting hypothesis, not a verdict."
              items={LIMITATIONS}
              footer="Lane's own experimental scales (extra interests and values, work dispositions, emotion judgement, idea tasks and life history) are collected but not shown until a pilot validates them."
            />
          </div>
        </section>

        <OnetAttribution className="mt-20" />
      </article>
    </AppPage>
  );
}
