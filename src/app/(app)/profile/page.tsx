import type { Metadata } from "next";
import { AppPage } from "@/components/shell/AppPage";
import { ReportHeader } from "@/components/report/ReportHeader";
import { SectionHeader } from "@/components/report/SectionHeader";
import { LimitationsBox } from "@/components/report/LimitationsBox";
import { EmptyState } from "@/components/report/EmptyState";
import { RadarProfile } from "@/components/data/RadarProfile";
import { TraitTable } from "@/components/data/TraitTable";
import { ScoreBar } from "@/components/data/ScoreBar";
import { ButtonLink } from "@/components/ui/Button";
import { ciHalf, fmtPercentile, formatIsoDot, pad2 } from "@/lib/format";
import { NORM_MIN_N } from "@/lib/assessment/scoring";
import { getProfile, getUser } from "@/lib/data";

export const metadata: Metadata = { title: "Profile report" };

export default async function ProfilePage() {
  const [user, profile] = await Promise.all([getUser(), getProfile()]);
  const ranked = [...profile.riasec].sort((a, b) => b.score.value - a.score.value);
  const code = ranked.length ? ranked.slice(0, 3).map((d) => d.key).join("") : "—";
  const normsReady = profile.normN >= NORM_MIN_N;
  const normNote = normsReady
    ? `Percentiles compare you with ${profile.normN} people who have taken the assessment.`
    : `Percentiles appear once ${NORM_MIN_N} people have completed the assessment (currently ${profile.normN}).`;

  return (
    <AppPage
      title="Profile report"
      meta={profile.reportId}
      action={
        profile.riasec.length && profile.traits.length ? (
          <ButtonLink href="/lanes" variant="secondary" size="sm">
            Open Lane Map
          </ButtonLink>
        ) : (
          <ButtonLink href="/assess" variant="secondary" size="sm">
            Continue assessment
          </ButtonLink>
        )
      }
    >
      <article className="max-w-content">
        <ReportHeader
          title={`Profile report · ${profile.version}`}
          subject={user.name}
          fields={[
            { label: "Report ID", value: profile.reportId },
            { label: "Updated", value: formatIsoDot(profile.issuedOn) },
            { label: "Age range", value: user.ageRange || "—" },
            { label: "Holland code", value: code },
          ]}
        />

        {profile.pending.length ? (
          <div className="mt-10 flex flex-col gap-4 rounded-sm border border-rule-strong bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="label text-caution">Provisional</p>
              <p className="mt-2 text-small text-ink-2">Not done yet: {profile.pending.join(" · ")}.</p>
            </div>
            <ButtonLink href="/assess" size="sm">
              Continue
            </ButtonLink>
          </div>
        ) : null}

        <section className="mt-16" aria-labelledby="summary-h">
          <SectionHeader index="01" label="Summary" title="In brief" id="summary-h" />
          <ol className="flex max-w-[840px] flex-col gap-5">
            {profile.summary.map((s, i) => (
              <li key={i} className="grid grid-cols-[32px_1fr] gap-2 text-body-l text-ink">
                <span className="pt-1 font-mono text-small text-ink-3">{pad2(i + 1)}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20" aria-labelledby="interests-h">
          <SectionHeader index="02" label="Interests · RIASEC" title="What kind of work draws you" id="interests-h" aside="0–100 · 80% interval" />
          {profile.riasec.length ? (
            <div className="grid gap-12 md:grid-cols-12">
              <div className="md:col-span-6 lg:col-span-5">
                <RadarProfile dimensions={profile.riasec} />
              </div>
              <div className="md:col-span-6 lg:col-span-6 lg:col-start-7">
                <table className="w-full border-collapse text-left">
                  <caption className="sr-only">Interest scores</caption>
                  <thead>
                    <tr className="border-b border-rule-strong">
                      <th scope="col" className="py-2 label font-normal text-ink-3">Dimension</th>
                      <th scope="col" className="py-2 text-right label font-normal text-ink-3">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((d) => (
                      <tr key={d.key} className="border-b border-rule">
                        <th scope="row" className="py-3 font-normal">
                          <span className="mr-3 font-mono text-small text-ink-3">{d.key}</span>
                          <span className="text-body text-ink">{d.label}</span>
                        </th>
                        <td className="py-3 text-right font-mono text-small text-ink">
                          {Math.round(d.score.value)} <span className="text-label text-ink-3">±{ciHalf(d.score)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-4 text-small text-ink-3">
                  Interest scores describe how much you like each kind of work, so there is no population median here.
                  Your top three letters form your Holland code: <span className="font-mono text-ink">{code}</span>.
                </p>
              </div>
            </div>
          ) : (
            <EmptyState title="Interests not finished." body="Answer the interests module to see this section." action={<ButtonLink href="/assess/interests" size="sm">Open interests</ButtonLink>} />
          )}
        </section>

        <section className="mt-20" aria-labelledby="personality-h">
          <SectionHeader index="03" label="Personality · Big Five" title="How you tend to work" id="personality-h" aside={normsReady ? "Tick = population median" : undefined} />
          {profile.traits.length ? (
            <>
              <TraitTable traits={profile.traits.map((t) => ({ ...t, score: { ...t.score, value: Math.round(t.score.value) } }))} caption="Big Five personality traits" />
              <p className="mt-4 text-small text-ink-3">{normNote}</p>
            </>
          ) : (
            <EmptyState title="Personality not finished." body="Answer the personality module to see this section." action={<ButtonLink href="/assess/personality" size="sm">Open personality</ButtonLink>} />
          )}
        </section>

        <section className="mt-20" aria-labelledby="aptitude-h">
          <SectionHeader index="04" label="Aptitudes · Cognitive games" title="How you reason under time pressure" id="aptitude-h" aside="% correct · 80% interval" />
          {profile.aptitudes.length ? (
            <ul className="grid gap-x-12 gap-y-8 md:grid-cols-2">
              {profile.aptitudes.map((a) => (
                <li key={a.id} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-body text-ink">{a.label}</span>
                    <span className="font-mono text-small text-ink">
                      {Math.round(a.score.value)}
                      <span className="text-label text-ink-3"> ±{ciHalf(a.score)}</span>
                      {a.score.percentile !== undefined ? <span className="ml-3 text-label text-ink-3">{fmtPercentile(a.score.percentile)}</span> : null}
                    </span>
                  </div>
                  <ScoreBar score={a.score} label={`${a.label} score`} />
                  <p className="text-small text-ink-3">{a.note}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No games played yet." body="Three short timed games, about 12 minutes in total." action={<ButtonLink href="/assess/cognitive" size="sm">Play the games</ButtonLink>} />
          )}
        </section>

        <section className="mt-20" aria-labelledby="values-h">
          <SectionHeader index="05" label="Work values" title="What you want work to give you" id="values-h" aside="Share of total weight" />
          {profile.values.length ? (
            <ol className="border-t border-rule-strong">
              {profile.values.map((v) => (
                <li key={v.id} className="grid grid-cols-[32px_1fr_auto] items-baseline gap-x-4 gap-y-1 border-b border-rule py-4 sm:grid-cols-[40px_200px_1fr_160px]">
                  <span className="font-mono text-small text-ink-3">{pad2(v.rank)}</span>
                  <span className="text-body text-ink">{v.label}</span>
                  <span className="col-start-2 text-small text-ink-2 sm:col-start-auto">{v.description}</span>
                  <span className="col-start-3 row-start-1 flex items-center gap-3 sm:col-start-auto sm:row-start-auto">
                    <span className="hidden h-1 flex-1 bg-rule sm:block" aria-hidden>
                      <span className="block h-full bg-ink" style={{ width: `${Math.min(100, (v.weight / 0.25) * 100)}%` }} />
                    </span>
                    <span className="w-10 text-right font-mono text-small text-ink">{Math.round(v.weight * 100)}%</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Values not ranked yet." body="16 quick statements, about 3 minutes." action={<ButtonLink href="/assess/values" size="sm">Rank values</ButtonLink>} />
          )}
        </section>

        <section className="mt-20" aria-labelledby="limits-h">
          <SectionHeader index="06" label="Read this" title="What this can and can't tell you" id="limits-h" />
          <div className="max-w-[840px]">
            <LimitationsBox
              title="A profile is a starting hypothesis, not a verdict."
              items={profile.limitations}
              footer="The Lane Map uses this profile as a prior. Sprint results then move it, in either direction."
            />
          </div>
        </section>
      </article>
    </AppPage>
  );
}
