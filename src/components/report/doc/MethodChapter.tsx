import { normBasis } from "@/lib/scoring/norms";
import type { ProfileScores } from "@/lib/scoring/profile";
import type { ScaleScore } from "@/lib/scoring/types";
import { BRAND } from "@/lib/brand";
import { LIMITATIONS } from "@/lib/view/profile";
import { basisLine } from "@/lib/view/findings";
import { V2_CONFIG } from "@/lib/matching/v2/config";
import { OnetAttribution } from "@/components/report/OnetAttribution";
import { OnetDbAttribution } from "@/components/report/OnetDbAttribution";
import { Chapter } from "./Chapter";

/** The running matching config reads published norms (v2-0.5 on). */
const MATCHING_NORMS = V2_CONFIG.inputs.norms;

const answered = (xs: { answered: number }[]) => xs.reduce((n, x) => n + x.answered, 0);
const meanRel = (xs: { reliability: number }[]) => (xs.length ? (xs.reduce((n, x) => n + x.reliability, 0) / xs.length).toFixed(2) : "—");
const rels = (xs: ScaleScore[]): { reliability: number }[] => xs.flatMap((s) => (s.normed ? [{ reliability: s.normed.reliability }] : s.self ? [{ reliability: s.self.reliability }] : []));

/** Method and limits: the instruments, how much each rests on, its reliability and norms, and every caveat, once. */
export function MethodChapter({ n, profile }: { n: string; profile: ProfileScores }) {
  const p = profile;
  const basis = normBasis(p);
  const rows = [
    p.interests && { instrument: "O*NET® Interest Profiler, short form", measures: "Six interest areas (RIASEC)", items: `${answered(p.interests.scales)} items`, reliability: meanRel(rels(p.interests.scales)), norms: basis.interests === "self" ? "Compared with your own average" : "Published norms (US adults, provisional)" },
    p.values && { instrument: "O*NET® Work Importance Locator", measures: "Six work values", items: "Card sort", reliability: "Ranking, within you", norms: "Within-person ranking" },
    p.personality && {
      instrument: "IPIP-NEO-120 + Honesty-Humility",
      measures: "Five domains, 30 facets",
      items: `${answered(p.personality.facets) + (p.personality.honestyHumility?.answered ?? 0)} items`,
      reliability: meanRel(rels(p.personality.domains)),
      norms: basis.personality === "self" ? "Compared with your own average" : "Published norms (provisional)",
    },
    p.reasoning && {
      instrument: "Generated reasoning tasks",
      measures: "Reasoning, spatial, quantitative, memory, speed",
      items: `${p.reasoning.areas.length} areas`,
      reliability: meanRel(p.reasoning.areas.flatMap((a) => (a.normed ? [a.normed] : []))),
      norms: p.reasoning.norms?.provisional ? "Provisional: adults 18–35, Norway" : "Population norms",
    },
    p.behaviour && { instrument: "Behaviour tasks", measures: "Learning, risk, patience", items: "3 tasks", reliability: "—", norms: "None yet: described, not compared" },
    (p.interests || p.personality) && {
      instrument: "Work Design model (provisional)",
      measures: "Nine value modes, eight working conditions",
      items: "Built from the scores above",
      reliability: "90% ranges carried through",
      norms: "Scale midpoint; careers from O*NET® data",
    },
  ].filter((r): r is NonNullable<typeof r> => !!r);

  return (
    <Chapter id="method" n={n} kicker="Method and limits" title="What this can and can't tell you">
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Instruments behind this report (scrolls sideways on narrow screens)">
        <table className="w-full min-w-[720px] border-collapse text-left text-small">
          <caption className="sr-only">Instruments behind this report</caption>
          <thead>
            <tr className="border-b border-rule-strong text-ink-3">
              {["Instrument", "Measures", "Based on", "Reliability", "Compared with"].map((h) => (
                <th key={h} scope="col" className="py-2 pr-4 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.instrument} className="border-b border-rule align-top">
                <th scope="row" className="py-3 pr-4 font-medium text-ink">
                  {r.instrument}
                </th>
                <td className="py-3 pr-4 text-ink-2">{r.measures}</td>
                <td className="py-3 pr-4 font-mono text-ink-2 tabular">{r.items}</td>
                <td className="py-3 pr-4 font-mono text-ink-2 tabular">{r.reliability}</td>
                <td className="py-3 text-ink-2">{r.norms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-small text-ink-3">Reliability is the mean of the scales&apos; reliabilities (1 = perfectly consistent); it sets the width of every 90% range in this report.</p>

      <h3 className="mt-12 text-h3 font-medium text-ink">Limits</h3>
      <ol className="mt-4 flex max-w-[760px] flex-col gap-4">
        {LIMITATIONS.map((item, i) => (
          <li key={i} className="grid grid-cols-[40px_1fr] text-body text-ink-2">
            <span className="font-mono text-small text-ink-3 tabular">{String(i + 1).padStart(2, "0")}</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>

      <h3 className="mt-12 text-h3 font-medium text-ink">Notes on the measures</h3>
      <ul className="mt-4 flex max-w-[760px] list-disc flex-col gap-3 pl-5 text-body text-ink-2">
        <li>{basisLine(p)}. A difference is called a strength or weakness only when it is larger than the measurement error of that difference.</li>
        {MATCHING_NORMS && (p.interests || p.personality) ? (
          <li>
            For matching only, your interest and personality scores are also compared with published groups, and those comparisons are not shown in this
            report. Interests: about 575 US adults aged 18 to 65 who took the O*NET Interest Profiler in a study for its developers (Rounds and colleagues,
            2016). Personality: a large online sample of mostly US adults of all ages, average age 28, who took the same personality questionnaire (320,128
            people; Kajonius and Johnson, 2019). Neither group is Norwegian or limited to your age.
          </li>
        ) : null}
        {p.personality ? <li>Facets have four items each, so their ranges are wide: read them as hints, never decide anything from a single facet. Openness is scored from five facets (the political-attitudes facet is not used).</li> : null}
        {p.reasoning?.norms?.provisional ? (
          <li>
            Reasoning is compared with adults 18–35 in Norway, using difficulty estimates made before {BRAND.name} had pilot data. Ranges may shift once real
            results are in. Results are a range, never an IQ score.
          </li>
        ) : null}
        <li>{BRAND.name}&apos;s own experimental scales (extra interests and values, work dispositions, emotion judgement, idea tasks and life history) are collected but not shown until a pilot validates them.</li>
        <li>
          How you work best: value modes and working conditions are weighted combinations of your interests, personality, values and tasks (a provisional model,
          fixed before any outcome data). Your scores sit on the questionnaire scales, while careers&apos; levels are percentiles across O*NET occupations: the two are
          placed side by side, not on one ruler. The archetypes are a metaphor for a measured pattern of value modes.
        </li>
        <li>
          Career fit (matching v2): fulfilment fit is the headline and is relative to you (50 = your average career path); ability fit compares your reasoning range
          with what each career demands. Both are recomputed over 500 draws of your scores, which is where their ranges and the fit bands come from. Fit describes a
          match, not a prediction of success.
        </li>
        <li>
          The written report is drafted by Claude from the scores in this report only. A check rejects any draft that cites a figure not in your scores, or that makes a
          claim about the brain, predicts success or mentions pay. Your best workday is written from your Work Design results alone, and each sentence must name the
          dimensions it rests on; any sentence without a source, or that names something not in those results, fails the check. It can still be wrong: the scores are
          the source.
        </li>
      </ul>

      <dl className="mt-12 grid max-w-[760px] gap-x-8 gap-y-2 border-t border-rule pt-4 text-small sm:grid-cols-[160px_1fr]">
        <dt className="text-ink-3">Scoring version</dt>
        <dd className="font-mono text-ink-2">{p.scoringVersion}</dd>
        <dt className="text-ink-3">Full method</dt>
        <dd>
          <a href="/method" className="text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ink">
            How {BRAND.name} works, with references
          </a>
        </dd>
      </dl>
      <OnetAttribution className="mt-8" />
      <OnetDbAttribution className="mt-4" />
    </Chapter>
  );
}
