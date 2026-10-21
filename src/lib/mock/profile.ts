/**
 * Sample results. Results pages show this until real norms exist (PLAN.md D1/D2, Q2).
 *
 * The sample is NOT hand-typed: it is produced by running the real scoring functions on a
 * synthetic persona's answers, so it has exactly the `ProfileScores` shape real users get.
 * Norming uses SAMPLE_PSYCHOMETRICS: invented, round placeholder values that exist only to
 * render the sample. They are never used for a real user (see scoring/psychometrics.ts).
 */
import type { User } from "../types";
import type { Psychometric } from "../scoring/core";
import { normed } from "../scoring/core";
import { scorePersonality } from "../scoring/personality";
import { scoreInterests } from "../scoring/interests";
import { scoreWil } from "../scoring/values";
import { buildProfile, type ProfileScores, type SessionScores } from "../scoring/profile";
import { itemIndex, WIL_MULTIPLIERS, WIL_VALUE_OF } from "../bank/bank";
import type { BankItem } from "../bank/types";

/** Fixed "today" for the sample data so renders are deterministic. */
export const TODAY = "2026-10-21";

export const user: User = {
  id: "usr_sample",
  name: "Ingrid Halvorsen",
  initials: "IH",
  ageRange: "25–34",
  city: "Oslo",
  situation: "Employed, considering a change",
  clarityGoal: "Whether to move toward something more independent",
  email: "ingrid.halvorsen@example.no",
  reportId: "LN-SAMPLE-IH",
  memberSince: "2026-08-17",
};

/** SAMPLE ONLY. Placeholder norms so the sample can show T-scores and intervals. Not real data. */
export const SAMPLE_PSYCHOMETRICS: Record<string, Psychometric> = {
  ...Object.fromEntries(
    ["N1", "N2", "N3", "N4", "N5", "N6", "E1", "E2", "E3", "E4", "E5", "E6", "O1", "O2", "O3", "O4", "O5", "A1", "A2", "A3", "A4", "A5", "A6", "C1", "C2", "C3", "C4", "C5", "C6"].map((f) => [
      `neo.${f}`,
      { mean: 3.2, sd: 0.75, reliability: 0.75 },
    ]),
  ),
  ...Object.fromEntries(["Neuroticism", "Extraversion", "Openness", "Agreeableness", "Conscientiousness"].map((d) => [`neo.${d}`, { mean: 3.2, sd: 0.55, reliability: 0.88 }])),
  "hh.HH": { mean: 3.3, sd: 0.8, reliability: 0.7 },
  ...Object.fromEntries(["R", "I", "A", "S", "E", "C"].map((c) => [`onet.${c}`, { mean: 27, sd: 8.5, reliability: 0.85 }])),
};

/* ---- the sample persona: enterprising and social, extraverted, low vulnerability ---- */

const facetTargets: Record<string, number> = {
  N1: 2.5, N2: 2.25, N3: 2, N4: 2.25, N5: 3, N6: 1.75,
  E1: 4.25, E2: 4, E3: 4.5, E4: 4, E5: 3.75, E6: 4,
  O1: 4, O2: 3.5, O3: 3.75, O4: 4.25, O5: 3.5,
  A1: 3.5, A2: 3.75, A3: 4, A4: 3.25, A5: 2.75, A6: 3.5,
  C1: 4, C2: 2.75, C3: 3.5, C4: 4.25, C5: 3, C6: 2.75,
};
const interestTargets: Record<string, number> = { R: 1.6, I: 3.1, A: 3.4, S: 3.9, E: 4.5, C: 2.2 };

/** Per-item answers that average to the target: split between the two nearest scale points. */
function answersFor(items: BankItem[], target: (i: BankItem) => number | undefined) {
  const out: Record<string, number> = {};
  const counters = new Map<string, number>();
  for (const it of items) {
    const t = target(it);
    if (t === undefined) continue;
    const scale = it.facet ?? it.scale ?? "";
    const n = counters.get(scale) ?? 0;
    counters.set(scale, n + 1);
    const lo = Math.floor(t);
    const frac = t - lo;
    const v = (n % 4) / 4 < frac ? lo + 1 : lo;
    out[it.id] = it.key === -1 ? 6 - v : v;
  }
  return out;
}

const byModule = (m: string) => [...itemIndex.values()].filter((i) => i.module === m && !i.validity);
const neoItems = byModule("01_personality_ipip_neo_120");
const hhItems = byModule("02_personality_honesty_humility");
const onetItems = byModule("03_interests_onet_ip_short_form");

const personality = scorePersonality(
  neoItems,
  hhItems,
  { ...answersFor(neoItems, (i) => facetTargets[i.facet!]), ...answersFor(hhItems, () => 3.5) },
  SAMPLE_PSYCHOMETRICS,
);
const interests = scoreInterests(onetItems, answersFor(onetItems, (i) => interestTargets[i.scale!]), SAMPLE_PSYCHOMETRICS);

/** WIL sort: Independence and Achievement high, Support low. 4 cards per column. */
const wilOrder = ["WIL_I", "WIL_M", "WIL_F", "WIL_T", "WIL_A", "WIL_L", "WIL_D", "WIL_G", "WIL_R", "WIL_O", "WIL_H", "WIL_E", "WIL_K", "WIL_J", "WIL_C", "WIL_S", "WIL_N", "WIL_B", "WIL_P", "WIL_Q"];
const wilSort = Object.fromEntries(wilOrder.map((id, i) => [id, 5 - Math.floor(i / 4)]));
const values = scoreWil(wilSort, WIL_VALUE_OF, WIL_MULTIPLIERS);

const ok = { flags: [], confidence: "ok" as const, indices: { infrequencyFails: [], instructedFails: [], blockMedianRtMs: {}, longestString: 4, evenOddR: 0.71, antonymR: -0.52 } };
const session = (id: SessionScores["session"], extra: Partial<SessionScores>): SessionScores => ({ session: id, validity: ok, hidden: {}, ...extra });

const base = buildProfile(
  {
    S1: { scores: session("S1", { interests, values }), completedAt: "2026-08-17" },
    S2: { scores: session("S2", { personality }), completedAt: "2026-08-20" },
    S3: {
      scores: session("S3", {
        cognitive: {
          accuracy: {
            matrix: { correct: 8, scored: 12, rapidGuesses: 0, proportion: 8 / 12, ci: [0.45, 0.83] },
            number_series: { correct: 6, scored: 8, rapidGuesses: 0, proportion: 0.75, ci: [0.48, 0.91] },
            letter_series: { correct: 4, scored: 6, rapidGuesses: 0, proportion: 4 / 6, ci: [0.36, 0.87] },
            rotation2d: { correct: 4, scored: 8, rapidGuesses: 0, proportion: 0.5, ci: [0.26, 0.74] },
          },
          span: { backward_digits: { span: 6, correctTrials: 7, trials: 10 } },
        },
      }),
      completedAt: "2026-08-24",
    },
    S4: {
      scores: session("S4", {
        cognitive: {
          accuracy: { quant: { correct: 5, scored: 6, rapidGuesses: 0, proportion: 5 / 6, ci: [0.52, 0.96] } },
          span: { corsi: { span: 5, correctTrials: 6, trials: 9 } },
          symbolMatch: { score: 41, correct: 45, incorrect: 4, attempted: 49 },
          learning: { perBlock: [], accuracySlope: 0.21, rtSlopeMs: -96, startingAccuracy: 0.46, relativeRate: 0.39 },
          balloon: { adjustedPumps: 31.4, bursts: 9, lossReactivity: -4.2, points: 652 },
          discountAuc: 0.58,
        },
      }),
      completedAt: "2026-08-26",
    },
    S5: { scores: session("S5", {}), completedAt: "2026-08-28" },
  },
  "provisional",
);

/** SAMPLE ONLY: normed reasoning areas and a general-ability band, as calibrated norms will provide. */
const area = (raw: number, mean: number, sd: number) => normed(raw, { mean, sd, reliability: 0.8 });

export const sampleProfile: ProfileScores = {
  ...base,
  reasoning: base.reasoning && {
    generalAbility: { percentileBand: [55, 81] },
    areas: base.reasoning.areas.map((a) => ({
      ...a,
      normed:
        a.id === "reasoning" ? area(0.69, 0.6, 0.15) : a.id === "spatial" ? area(0.5, 0.6, 0.18) : a.id === "quantitative" ? area(0.83, 0.55, 0.16) : a.id === "memory" ? area(5.5, 5.2, 1.1) : area(41, 33, 7),
    })),
  },
};
