/**
 * Lane model v1. Each lane is a weighted profile over Lane's measured features.
 *
 * Fit is ipsative: every feature is z-scored against the person's OWN mean and spread,
 * so a lane ranks high when it leans on someone's relatively stronger features.
 * Weights are expert-set starting points, to be re-fitted on sprint outcomes later.
 */
import type { Confidence, Lane, LaneGroup, PayoffType } from "../types";
import type { ProfileScores, ScoredScale } from "./scoring";
import { VALUE_DEFS, type ValueId } from "./items";

type FeatureKey =
  | "R" | "I" | "A" | "S" | "E" | "C"
  | "open" | "consc" | "extra" | "agree" | "stable"
  | "verbal" | "numerical" | "pattern" | "speed";

const featureLabel: Record<FeatureKey, string> = {
  R: "Realistic interest",
  I: "Investigative interest",
  A: "Artistic interest",
  S: "Social interest",
  E: "Enterprising interest",
  C: "Conventional interest",
  open: "Openness",
  consc: "Conscientiousness",
  extra: "Extraversion",
  agree: "Agreeableness",
  stable: "Low stress reactivity",
  verbal: "Verbal reasoning",
  numerical: "Numerical reasoning",
  pattern: "Pattern reasoning",
  speed: "Processing speed",
};

type LaneDef = {
  id: string;
  name: string;
  group: LaneGroup;
  payoff: PayoffType;
  summary: string;
  weights: Partial<Record<FeatureKey, number>>;
  values: Partial<Record<ValueId, number>>;
  /** Something that matters a lot for this lane and that Lane does not measure. */
  unmeasured?: string;
};

export const LANE_DEFS: LaneDef[] = [
  { id: "sales-b2b", name: "B2B sales", group: "corporate", payoff: "convex", summary: "Finding, qualifying and closing business customers. Commission makes pay accelerate with skill.", weights: { E: 0.35, extra: 0.25, stable: 0.15, S: 0.1, verbal: 0.1, consc: 0.05 }, values: { income: 0.4, achievement: 0.3, autonomy: 0.1, security: -0.2 } },
  { id: "content", name: "Independent content creator", group: "independent", payoff: "winner-take-all", summary: "Building an audience through video, writing or audio, monetised through ads, sponsors or products.", weights: { A: 0.3, open: 0.2, consc: 0.15, E: 0.15, extra: 0.1, verbal: 0.1 }, values: { autonomy: 0.35, recognition: 0.3, variety: 0.15, security: -0.2 } },
  { id: "recruiting", name: "Recruiter", group: "corporate", payoff: "linear", summary: "Sourcing, assessing and persuading candidates. Agency roles add commission.", weights: { S: 0.3, E: 0.3, extra: 0.15, agree: 0.15, verbal: 0.1 }, values: { relationships: 0.3, income: 0.2, variety: 0.2, impact: 0.1 } },
  { id: "coaching", name: "Coach", group: "independent", payoff: "convex", summary: "Helping individuals or teams improve performance, one-to-one or in groups.", weights: { S: 0.4, agree: 0.15, open: 0.15, verbal: 0.1, stable: 0.1, E: 0.1 }, values: { impact: 0.4, autonomy: 0.3, relationships: 0.2 } },
  { id: "product", name: "Product manager", group: "corporate", payoff: "linear", summary: "Deciding what a team builds and why, balancing users, business and engineering.", weights: { E: 0.2, I: 0.2, verbal: 0.15, consc: 0.15, open: 0.1, numerical: 0.1, S: 0.1 }, values: { achievement: 0.3, impact: 0.2, variety: 0.2 } },
  { id: "founder", name: "Solo founder", group: "independent", payoff: "winner-take-all", summary: "Building and selling a small product or service alone, from idea to revenue.", weights: { E: 0.3, open: 0.15, stable: 0.15, consc: 0.15, A: 0.1, I: 0.1 }, values: { autonomy: 0.4, income: 0.3, security: -0.3 } },
  { id: "consulting", name: "Management consultant", group: "corporate", payoff: "convex", summary: "Structured problem-solving for client organisations, presented and sold to senior people.", weights: { I: 0.2, E: 0.2, verbal: 0.2, numerical: 0.15, consc: 0.15, extra: 0.1 }, values: { achievement: 0.35, income: 0.3, variety: 0.2 } },
  { id: "podcast", name: "Podcast or broadcast host", group: "performance", payoff: "winner-take-all", summary: "Interviewing, presenting and holding an audience's attention through audio or live broadcast.", weights: { extra: 0.3, A: 0.25, verbal: 0.2, open: 0.15, S: 0.1 }, values: { recognition: 0.4, autonomy: 0.3, variety: 0.2, security: -0.2 } },
  { id: "marketing", name: "Brand marketer", group: "corporate", payoff: "linear", summary: "Shaping how a product is positioned, named and talked about across channels.", weights: { A: 0.3, E: 0.2, open: 0.15, verbal: 0.15, I: 0.1, S: 0.1 }, values: { variety: 0.3, recognition: 0.2, relationships: 0.2 } },
  { id: "real-estate", name: "Real-estate agent", group: "independent", payoff: "convex", summary: "Representing buyers and sellers; income is almost entirely commission.", weights: { E: 0.35, extra: 0.25, S: 0.15, stable: 0.15, C: 0.1 }, values: { income: 0.4, autonomy: 0.3, security: -0.3 } },
  { id: "ux-research", name: "UX researcher", group: "corporate", payoff: "linear", summary: "Studying how people use products through interviews, observation and testing.", weights: { I: 0.3, S: 0.25, verbal: 0.15, agree: 0.1, open: 0.1, C: 0.1 }, values: { impact: 0.3, relationships: 0.2, achievement: 0.1 } },
  { id: "journalist", name: "Freelance journalist", group: "independent", payoff: "convex", summary: "Reporting and writing stories, pitched to and paid by editors piece by piece.", weights: { verbal: 0.25, I: 0.2, A: 0.2, open: 0.15, extra: 0.1, stable: 0.1 }, values: { autonomy: 0.3, impact: 0.2, recognition: 0.2, security: -0.2 } },
  { id: "trader", name: "Discretionary trader", group: "independent", payoff: "winner-take-all", summary: "Making directional market bets with own or allocated capital; results are noisy for years.", weights: { numerical: 0.25, stable: 0.25, I: 0.2, pattern: 0.15, E: 0.1, agree: -0.05 }, values: { income: 0.5, autonomy: 0.3, security: -0.4 } },
  { id: "data-analyst", name: "Data analyst", group: "corporate", payoff: "linear", summary: "Turning raw data into answers for decision-makers, mostly through SQL, spreadsheets and charts.", weights: { I: 0.3, C: 0.25, numerical: 0.25, consc: 0.1, pattern: 0.1 }, values: { security: 0.3, achievement: 0.2 } },
  { id: "chef", name: "Chef", group: "craft", payoff: "convex", summary: "Cooking professionally, from line work to running a kitchen or your own place.", weights: { R: 0.3, A: 0.25, stable: 0.15, consc: 0.15, speed: 0.15 }, values: { achievement: 0.3, recognition: 0.2, variety: 0.2 } },
  { id: "performer", name: "Stage or screen performer", group: "performance", payoff: "winner-take-all", summary: "Acting or performing professionally, usually alongside other work for years.", weights: { A: 0.35, extra: 0.3, stable: 0.15, open: 0.1, verbal: 0.1 }, values: { recognition: 0.4, autonomy: 0.2, security: -0.3 } },
  { id: "software", name: "Software engineer", group: "corporate", payoff: "convex", summary: "Designing and building software systems, usually in a team.", weights: { I: 0.3, pattern: 0.2, numerical: 0.15, consc: 0.15, R: 0.1, C: 0.1 }, values: { achievement: 0.3, autonomy: 0.2 } },
  { id: "electrician", name: "Electrician", group: "craft", payoff: "linear", summary: "Installing and maintaining electrical systems; a regulated trade with an apprenticeship route.", weights: { R: 0.45, C: 0.2, consc: 0.15, numerical: 0.1, pattern: 0.1 }, values: { security: 0.4, autonomy: 0.1 } },
  { id: "carpenter", name: "Carpenter", group: "craft", payoff: "linear", summary: "Building and fitting structures and interiors in wood; trade certificate route.", weights: { R: 0.45, A: 0.15, consc: 0.15, pattern: 0.15, C: 0.1 }, values: { achievement: 0.3, autonomy: 0.2, security: 0.2 } },
  { id: "athlete", name: "Professional athlete", group: "performance", payoff: "winner-take-all", summary: "Competing for a living. Physical ability is not measured here, so this estimate is weak.", weights: { R: 0.3, E: 0.2, stable: 0.2, consc: 0.2, speed: 0.1 }, values: { achievement: 0.4, recognition: 0.3 }, unmeasured: "physical ability" },
];

export const laneMeta = Object.fromEntries(LANE_DEFS.map((l) => [l.id, l])) as Record<string, LaneDef>;

function features(scores: ProfileScores): Partial<Record<FeatureKey, ScoredScale>> {
  const t = scores.traits;
  const out: Partial<Record<FeatureKey, ScoredScale>> = { ...scores.riasec };
  if (t.openness) out.open = t.openness;
  if (t.conscientiousness) out.consc = t.conscientiousness;
  if (t.extraversion) out.extra = t.extraversion;
  if (t.agreeableness) out.agree = t.agreeableness;
  if (t.neuroticism) {
    const n = t.neuroticism;
    out.stable = { ...n, value: 100 - n.value, ci: [100 - n.ci[1], 100 - n.ci[0]] };
  }
  Object.assign(out, scores.aptitudes);
  return out;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const stdev = (xs: number[]) => Math.sqrt(avg(xs.map((x) => (x - avg(xs)) ** 2)));
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const r1 = (n: number) => Math.round(n * 10) / 10;

/** The Lane Map needs complete interests and personality. Games and values sharpen it. */
export function canRankLanes(scores: ProfileScores) {
  return Object.keys(scores.riasec).length === 6 && Object.keys(scores.traits).length === 5;
}

export type SimilarStats = Record<string, { n: number; continuedPct: number | null }>;

export function computeLanes(scores: ProfileScores, similar: SimilarStats = {}): Lane[] {
  const f = features(scores);
  const keys = Object.keys(f) as FeatureKey[];
  const xs = keys.map((k) => f[k]!.value);
  const m = avg(xs);
  const s = Math.max(10, stdev(xs));
  const z = (k: FeatureKey) => (f[k]!.value - m) / s;

  const values = scores.values;
  const vMean = values ? avg(values.map((v) => v.weight)) : 0;
  const vSd = values ? Math.max(0.02, stdev(values.map((v) => v.weight))) : 1;
  const vz = (id: ValueId) => {
    const v = values?.find((x) => x.id === id);
    return v ? (v.weight - vMean) / vSd : 0;
  };
  const valueLabel = (id: ValueId) => `${VALUE_DEFS.find((v) => v.id === id)?.label ?? id} (value)`;

  return LANE_DEFS.map((def): Lane => {
    const entries = Object.entries(def.weights) as [FeatureKey, number][];
    const totalW = entries.reduce((a, [, w]) => a + Math.abs(w), 0);
    const present = entries.filter(([k]) => f[k]);
    const presentW = present.reduce((a, [, w]) => a + Math.abs(w), 0);
    const coverage = presentW / totalW;

    const contribs = present.map(([k, w]) => ({ label: featureLabel[k], contribution: (w * z(k)) / presentW }));
    let raw = contribs.reduce((a, c) => a + c.contribution, 0);

    const vEntries = Object.entries(def.values) as [ValueId, number][];
    const vTotal = vEntries.reduce((a, [, w]) => a + Math.abs(w), 0);
    const valueContribs = values ? vEntries.map(([id, w]) => ({ label: valueLabel(id), contribution: (w * vz(id)) / vTotal })) : [];
    if (values) {
      const vt = valueContribs.reduce((a, c) => a + c.contribution, 0);
      raw = 0.8 * raw + 0.2 * vt;
    }

    const value = clamp(50 + 30 * raw, 2, 98);
    const featureHalf = avg(present.map(([k, w]) => ((f[k]!.ci[1] - f[k]!.ci[0]) / 2) * Math.abs(w))) / avg(present.map(([, w]) => Math.abs(w)));
    let half = 4 + 0.6 * featureHalf + 20 * (1 - coverage) + (values ? 0 : 3) + (def.unmeasured ? 12 : 0);
    half = clamp(half, 5, 30);
    const confidence: Confidence = def.unmeasured ? "low" : half <= 8 ? "high" : half <= 13 ? "med" : "low";

    const drivers = [...contribs.map((c) => ({ ...c, contribution: c.contribution * (values ? 0.8 : 1) })), ...valueContribs.map((c) => ({ ...c, contribution: c.contribution * 0.2 }))]
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, def.unmeasured ? 2 : 3)
      .map((d) => ({ label: d.label, contribution: Math.round(d.contribution * 100) / 100 }));
    if (def.unmeasured) drivers.unshift({ label: `Not assessed: ${def.unmeasured}`, contribution: 0 });

    const position = clamp(0.5 + 0.22 * raw, 0.05, 0.95);
    const posHalf = 0.1 + half / 150;
    const sim = similar[def.id];

    return {
      id: def.id,
      name: def.name,
      group: def.group,
      payoff: def.payoff,
      summary: def.summary,
      relativeFit: { value: r1(value), ci: [r1(clamp(value - half, 0, 100)), r1(clamp(value + half, 0, 100))] },
      payoffPosition: r1(position * 100) / 100,
      payoffPositionCi: [clamp(position - posHalf, 0.01, 0.99), clamp(position + posHalf, 0.01, 0.99)],
      confidence,
      drivers,
      similar: { n: sim?.n ?? 0, continuedPct: sim?.continuedPct ?? null },
    };
  });
}
