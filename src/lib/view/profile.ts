/**
 * View helpers for results pages. Pure; turn ProfileScores into display-ready values.
 * Interpretation sentences are UI copy describing score bands, not assessment content.
 */
import type { Normed } from "../scoring/core";
import { relativeStrengths, type Relative } from "../scoring/relative";
import type { ProfileScores } from "../scoring/profile";
import type { SelfScore } from "../scoring/types";
import type { InterestScores } from "../scoring/interests";

/** T-scores are drawn on 20–80 (±3 SD) mapped to 0–100 for bars. */
export const tToBar = (t: number) => Math.min(100, Math.max(0, ((t - 20) / 60) * 100));

export const fmtT = (n: Normed) => Math.round(n.t);
export const fmtHalf = (n: Normed) => Math.round((n.ci[1] - n.ci[0]) / 2);
export const fmtBand = (n: Normed) => `P${n.percentileBand[0]}–${n.percentileBand[1]}`;

type Band = "low" | "mid" | "high";
export const band = (n: Normed): Band => (n.ci[1] < 50 ? "low" : n.ci[0] > 50 ? "high" : "mid");

const DOMAIN_TEXT: Record<string, Record<Band, string>> = {
  Neuroticism: {
    low: "Below-average reactivity to stress and setbacks.",
    mid: "Typical reactions to stress; setbacks sting but pass.",
    high: "Feels pressure and setbacks strongly; recovery routines matter.",
  },
  Extraversion: {
    low: "Recharges alone; likely does best work with fewer interruptions.",
    mid: "Comfortable with people and with stretches of solo work.",
    high: "Gains energy from people; comfortable taking the lead socially.",
  },
  Openness: {
    low: "Prefers proven methods and concrete problems.",
    mid: "Open to new ideas when they have a clear use.",
    high: "Seeks novelty and ideas; tolerates ambiguity well.",
  },
  Agreeableness: {
    low: "Direct and comfortable with conflict; may come across as blunt.",
    mid: "Cooperative without avoiding disagreement.",
    high: "Warm and cooperative; hard negotiations may drain energy.",
  },
  Conscientiousness: {
    low: "Works in bursts; external structure and deadlines help a lot.",
    mid: "Organised when it matters; benefits from deadlines.",
    high: "Plans ahead and follows through, even on dull tasks.",
  },
  HH: {
    low: "Status and money are strong motivators.",
    mid: "Balanced between modesty and wanting recognition.",
    high: "Modest; little drawn to status or luxury.",
  },
};

export function interpret(scaleId: string, n: Normed | null, self?: SelfScore | null): string {
  if (n) return DOMAIN_TEXT[scaleId]?.[band(n)] ?? "";
  // Without norms, only a comparison with the person's own other traits is possible.
  if (self) return self.ci[0] > 0 ? "Higher than your other traits." : self.ci[1] < 0 ? "Lower than your other traits." : "Around your own average.";
  return "Interpretation appears once norms are loaded.";
}

type Comparable = { id: string; normed: Normed | null; self?: SelfScore | null };
/** The score used for "relative to yourself" comparisons: population-normed when available, else self-relative. */
const comparable = (s: Comparable) => (s.normed ? { z: s.normed.z, reliability: s.normed.reliability } : s.self ? { z: s.self.z, reliability: s.self.reliability } : null);

/** BLUEPRINT §7 relative strengths for a set of scales; scales with no comparable score get "none". */
export function relativeOf(scales: Comparable[]): Record<string, Relative> {
  const ok = scales.flatMap((s) => {
    const c = comparable(s);
    return c ? [{ id: s.id, ...c }] : [];
  });
  const r = relativeStrengths(ok);
  return Object.fromEntries(scales.map((s) => [s.id, r[s.id] ?? "none"]));
}

export const relativeLabel: Record<Relative, string> = {
  strength: "Relative strength",
  weakness: "Relative weakness",
  none: "No clear difference",
};

const RIASEC_GLOSS: Record<string, string> = {
  R: "hands-on, practical work",
  I: "analysing and investigating",
  A: "making and expressing original things",
  S: "helping, teaching and supporting people",
  E: "persuading, leading and selling",
  C: "organising and keeping things in order",
};

/** Three plain-language summary sentences from the profile. Hedged on purpose. */
export function summarise(p: ProfileScores): string[] {
  const out: string[] = [];
  const i = p.interests;
  if (i?.hollandCode) {
    const [a, b] = i.hollandCode.split("");
    const low = [...i.scales].sort((x, y) => (x.raw ?? 0) - (y.raw ?? 0))[0]!;
    out.push(`Your interests lean toward ${RIASEC_GLOSS[a!]} and ${RIASEC_GLOSS[b!]}, with ${RIASEC_GLOSS[low.code]} the least appealing.`);
  } else if (i?.lowDifferentiation) {
    out.push("Your interests are fairly even across all six areas. That often means they are still forming; trying careers will tell you more than this scale can.");
  }
  const d = p.personality?.domains.filter((x) => x.normed !== null || !!x.self) ?? [];
  if (d.length) {
    const rel = relativeOf(d);
    const strengths = d.filter((x) => rel[x.id] === "strength").map((x) => x.label.toLowerCase());
    out.push(
      strengths.length
        ? `Compared with the rest of your personality profile, ${strengths.join(" and ")} stand${strengths.length === 1 ? "s" : ""} out clearly.`
        : "None of your five personality domains stands out from the others by more than the measurement can resolve, so treat the differences between them as tentative.",
    );
  }
  const areas = p.reasoning?.areas ?? [];
  if (areas.length) {
    const rel = relativeOf(areas);
    const s = areas.filter((a) => rel[a.id] === "strength").map((a) => a.label.toLowerCase());
    out.push(s.length ? `In the reasoning tasks, ${s.join(" and ")} came out as a clear relative strength.` : "In the reasoning tasks, no area stood out clearly from the others.");
  }
  if (out.length === 0) out.push("Complete sessions S1 and S2 to see your summary.");
  return out;
}

export const LIMITATIONS = [
  "It cannot give certainty. Even a strong battery explains a modest share of the differences in career outcomes; most of the rest comes from opportunity, effort, luck, timing and the specific job.",
  "Scores are ranges, not points. Facets with four items are especially imprecise, so they are shown with wide intervals and never used on their own.",
  "It cannot measure physical talent. For athletic careers it describes motivation and temperament, not whether the body is elite.",
  "It measures you at one point in time. Interests and personality keep developing through the twenties; retake interests and values each year.",
  "It cannot replace trying. The profile is a well-informed hypothesis. Sprints test it.",
];

/** RadarProfile input from O*NET interest scores: geometry on the 10–50 range, labels show raw sums. */
export function radarDims(interests: InterestScores) {
  return interests.scales.map((s) => ({
    key: s.code,
    label: s.label,
    score: { value: s.raw === null ? 0 : ((s.raw - 10) / 40) * 100, ci: [0, 0] as [number, number] },
    display: s.raw === null ? "—" : String(Math.round(s.raw)),
  }));
}
