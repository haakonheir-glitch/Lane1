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
/** Percentile bands as shown: the upper bound is capped at 99, since "the 100th percentile" doesn't exist. */
export const pctBand = ([lo, hi]: [number, number]): [number, number] => [Math.min(lo, 99), Math.min(hi, 99)];
export const fmtPct = (b: [number, number]) => `P${pctBand(b)[0]}–${pctBand(b)[1]}`;
export const fmtBand = (n: Normed) => fmtPct(n.percentileBand);

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
  return "Not enough answers to interpret yet.";
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

/** "a", "a and b", "a, b and c". */
export const listWords = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : (xs[0] ?? ""));

/**
 * The "In brief" lines: interests, values, personality, reasoning and the closest career paths.
 * Only differences that pass the relative-strength test are stated as findings; the rest are
 * called tentative.
 */
export function summarise(p: ProfileScores, topPaths: string[] = []): string[] {
  const out: string[] = [];
  const i = p.interests;
  if (i?.hollandCode) {
    const rel = relativeOf(i.scales);
    const strong = i.scales.filter((x) => rel[x.id] === "strength").map((x) => RIASEC_GLOSS[x.code]!);
    const weak = i.scales.filter((x) => rel[x.id] === "weakness").map((x) => RIASEC_GLOSS[x.code]!);
    const [a, b] = i.hollandCode.split("");
    if (strong.length || weak.length) {
      const parts = [strong.length ? `${listWords(strong)} clearly appeal${strong.length === 1 ? "s" : ""} to you most` : "", weak.length ? `${listWords(weak)} clearly appeal${weak.length === 1 ? "s" : ""} least` : ""].filter(Boolean);
      out.push(`${parts.join(", and ")}.`.replace(/^./, (c) => c.toUpperCase()) + (strong.length ? "" : ` Your lean toward ${RIASEC_GLOSS[a!]} is tentative.`));
    } else {
      out.push(`Your interests lean tentatively toward ${RIASEC_GLOSS[a!]} and ${RIASEC_GLOSS[b!]}; the gaps between areas are within measurement error.`);
    }
  } else if (i?.lowDifferentiation) {
    out.push("Your interests are fairly even across all six areas. That often means they are still forming, so read the career matches with extra care.");
  }
  const values = p.values?.filter((v) => v.visibility === "user").sort((a, b) => a.rank - b.rank) ?? [];
  if (values.length > 1) out.push(`In your card sort, ${values[0]!.label.toLowerCase()} came first as what you want from work, then ${values[1]!.label.toLowerCase()}.`);
  const d = p.personality?.domains.filter((x) => x.normed !== null || !!x.self) ?? [];
  if (d.length) {
    const rel = relativeOf(d);
    const hi = d.filter((x) => rel[x.id] === "strength").map((x) => x.label.toLowerCase());
    const lo = d.filter((x) => rel[x.id] === "weakness").map((x) => x.label.toLowerCase());
    out.push(
      hi.length || lo.length
        ? `Compared with the rest of your personality profile, ${[hi.length ? `${listWords(hi)} ${hi.length === 1 ? "is" : "are"} clearly higher` : "", lo.length ? `${listWords(lo)} ${lo.length === 1 ? "is" : "are"} clearly lower` : ""].filter(Boolean).join(" and ")}; other differences are tentative.`
        : "None of your five personality domains stands out from the others by more than the measurement can resolve, so treat the differences between them as tentative.",
    );
  }
  const areas = p.reasoning?.areas ?? [];
  if (areas.length) {
    const rel = relativeOf(areas);
    const s = areas.filter((a) => rel[a.id] === "strength").map((a) => a.label.toLowerCase());
    const w = areas.filter((a) => rel[a.id] === "weakness").map((a) => a.label.toLowerCase());
    out.push(
      s.length && w.length
        ? `In the reasoning tasks, ${listWords(s)} came out as a clear relative strength and ${listWords(w)} as a clear relative weakness.`
        : s.length
          ? `In the reasoning tasks, ${listWords(s)} came out as a clear relative strength; the other differences are tentative.`
          : w.length
            ? `In the reasoning tasks, ${listWords(w)} came out as a clear relative weakness; the other areas can't be told apart.`
            : "In the reasoning tasks, no area stood out clearly from the others; the differences between them are tentative.",
    );
  }
  if (topPaths.length && out.length) out.push(`Your closest career paths are ${listWords(topPaths)}. The Career map shows why, and what each involves.`);
  if (out.length === 0) out.push("Complete sessions S1 and S2 to see your summary.");
  return out.slice(0, 5);
}

export const LIMITATIONS = [
  "It cannot give certainty. Even a strong battery explains a modest share of the differences in career outcomes; most of the rest comes from opportunity, effort, luck, timing and the specific job.",
  "Scores are ranges, not points. Facets with four items are especially imprecise, so they are shown with wide intervals and never used on their own.",
  "It cannot measure physical talent. For athletic careers it describes motivation and temperament, not whether the body is elite.",
  "It measures you at one point in time. Interests and personality keep developing through the twenties; retake interests and values each year.",
  "It describes fit, not destiny. Use it to decide which careers to look into first.",
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
