/**
 * The facts a written report may use: computed scores only, rounded, with no name, email or
 * individual answers. Claude writes from these and nothing else (PLAN D49). Pure.
 */
import { normBasis, type Basis } from "../scoring/norms";
import type { ProfileScores } from "../scoring/profile";
import type { ScaleScore } from "../scoring/types";
import { pctBand, relativeOf } from "../view/profile";
import { hollandDisplay } from "../view/holland";
import type { WorkBest } from "../workdesign/best";

type Range = { mean: number; p10: number; p90: number };

export type ReportCareerPath = {
  name: string;
  family: string;
  band: "strong" | "possible" | "unlikely" | "insufficient";
  /** Matching v2: fulfilment fit (50 = the person's average career path) and ability fit (0–100), 10th–90th percentile of the draws. */
  fulfilmentFit: Range | null;
  abilityFit: Range | null;
  /** True when the career's O*NET profile is estimated from analog occupations, not linked. */
  estimatedProfile: boolean;
  /** Talent-selected career paths: capped at "possible", with this note (to be said as it is). */
  talentNote: string | null;
  drivers: string[];
  frictions: string[];
  entry: string;
  /** What the work involves day to day: the career's top O*NET work activities (or, without them, its demand tags). */
  dayToDay: string[];
  /** Why this career path is in the facts: a strong fit, or one the person said they're considering / work in now. */
  listedBecause: "strong_fit" | "considering" | "current_job";
  /** The direction it belongs to (strong fits grouped by value mode and family), or null. The directions' career paths fit about equally well: not a ranking. */
  direction: string | null;
};

export type ReportFacts = ReturnType<typeof buildReportFacts>;

const r1 = (n: number) => Math.round(n * 10) / 10;
/** The comparable score for a scale: population-normed if available, else relative to the person. */
const vsWith = (basis: Basis) => (s: ScaleScore) => (basis === "population" ? (s.normed ? r1(s.normed.z) : null) : s.self ? r1(s.self.z) : null);
/** The score under the key that says what it is compared with. */
const scoreKey = (basis: Basis) => (basis === "population" ? "vsPopulation" : "vsOwnAverage");

const TAG = { strength: "relative strength", weakness: "relative weakness", none: null } as const;

/**
 * `workDesign` is the "How you work best" data (src/lib/workdesign/best.ts) with its dimension ids;
 * the best workday is written from it alone (src/lib/report/workday.ts).
 */
export function buildReportFacts(p: ProfileScores, careerPaths: ReportCareerPath[], situation: { current: string | null; considering: string[] }, workDesign: WorkBest | null = null) {
  const bases = normBasis(p);
  const basis = bases.interests === "population" && bases.personality === "population" ? "population" : bases.interests === "self" && bases.personality === "self" ? "self" : "mixed";
  const vsI = vsWith(bases.interests);
  const vsP = vsWith(bases.personality);
  const kI = scoreKey(bases.interests);
  const kP = scoreKey(bases.personality);
  const interestTags = p.interests ? relativeOf(p.interests.scales) : {};
  const domainTags = p.personality ? relativeOf(p.personality.domains) : {};
  const areaTags = p.reasoning ? relativeOf(p.reasoning.areas) : {};
  const facets = (p.personality?.facets ?? []).filter((f) => vsP(f) !== null).sort((a, b) => vsP(b)! - vsP(a)!);

  return {
    basis,
    basisExplained:
      basis === "self"
        ? "Scores are compared with this person's own other scores on the same test (0 = their own average, in units of their own spread). There is no comparison with other people."
        : basis === "population"
          ? "Scores are compared with published population norms (provisional): vsPopulation is a z-score, 0 = the norm group's average."
          : `${bases.interests === "population" ? "Interests" : "Personality"} are compared with published population norms (provisional; vsPopulation is a z-score, 0 = the norm group's average). ${bases.interests === "population" ? "Personality is" : "Interests are"} compared with this person's own other scores (vsOwnAverage, 0 = their own average). Never compare the two kinds of number.`,
    interests: p.interests
      ? {
          // Only letters clearly above the person's own average; a weak third is marked "(R, weak)".
          hollandCode: hollandDisplay(p.interests).text,
          lowDifferentiation: p.interests.lowDifferentiation,
          areas: [...p.interests.scales]
            .sort((a, b) => (b.raw ?? 0) - (a.raw ?? 0))
            .map((s) => ({ area: s.label, rawOutOf50: s.raw, [kI]: vsI(s), tag: TAG[interestTags[s.id] ?? "none"] })),
        }
      : null,
    workValues: p.values?.filter((v) => v.visibility === "user").map((v) => ({ value: v.label, rank: v.rank })) ?? null,
    personality: p.personality
      ? {
          domains: p.personality.domains.map((d) => ({ domain: d.label, [kP]: vsP(d), tag: TAG[domainTags[d.id] ?? "none"] })),
          // Facets have four items each: wide intervals, hints only.
          highestFacets: facets.slice(0, 3).map((f) => ({ facet: f.label, [kP]: vsP(f) })),
          lowestFacets: facets.slice(-3).reverse().map((f) => ({ facet: f.label, [kP]: vsP(f) })),
        }
      : null,
    reasoning: p.reasoning
      ? {
          basis: "population (provisional)",
          note: "Reasoning areas are compared with adults 18–35 in Norway using provisional norms: item difficulties and averages were estimated offline by an AI model, using expert-panel methods, before any pilot data exists. Treat percentiles as rough ranges (the 90% band), never as exact ranks. Percent correct is not comparable across tasks; compare areas only through the tags.",
          areas: p.reasoning.areas.map((a) => ({
            area: a.label,
            result: a.summary,
            percentileBand90: a.normed ? pctBand(a.normed.percentileBand) : null,
            normConfidence: a.normed ? (a.normConfidence ?? "low") : null,
            tag: TAG[areaTags[a.id] ?? "none"],
          })),
          generalAbilityPercentileBand90: p.reasoning.generalAbility ? pctBand(p.reasoning.generalAbility.percentileBand) : null,
        }
      : null,
    behaviour: p.behaviour
      ? {
          learning: p.behaviour.learning?.relativeRate != null ? { improvementVsStartPercent: Math.round(p.behaviour.learning.relativeRate * 100) } : null,
          risk: p.behaviour.risk?.adjustedPumps != null ? { averagePumpsKeptOutOf64: r1(p.behaviour.risk.adjustedPumps) } : null,
          patience: p.behaviour.patience?.auc != null ? { patienceIndexFrom0To1: Math.round(p.behaviour.patience.auc * 100) / 100 } : null,
        }
      : null,
    dataQuality: p.sessions.filter((s) => s.confidence === "low").map((s) => ({ session: s.id, issues: s.flags })),
    missingSessions: p.completeness.missing,
    situation,
    workDesign,
    careerPaths,
  };
}

/** Every number that appears anywhere in the facts, as written there. */
export function numbersIn(facts: unknown): Set<string> {
  const out = new Set<string>();
  for (const m of JSON.stringify(facts).matchAll(/-?\d+(?:\.\d+)?/g)) out.add(m[0].replace(/^-/, ""));
  return out;
}
