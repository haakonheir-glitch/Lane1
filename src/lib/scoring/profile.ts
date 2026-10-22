/**
 * Session scoring and the profile shape. `ProfileScores` contains user-facing scales only:
 * experimental scales are scored into `SessionScores.hidden` and never reach it.
 * The mock profile in /lib/mock uses exactly this type, so it can be swapped for real scores.
 */
import type { Normed, Psychometric } from "./core";
import type { BankItem, SessionId } from "../bank/types";
import { scorePersonality, type PersonalityScores } from "./personality";
import { scoreInterests, type InterestScores } from "./interests";
import { scoreValuesExtension, scoreWil, type QSort, type ValueScore } from "./values";
import { scoreDispositions, scoreIdeas, scoreInterestExtension, scoreSjt } from "./experimental";
import { checkValidity, type LoggedResponse, type ValidityResult } from "./validity";
import { scoreAccuracy, type AccuracyScore, type AccuracyTrial } from "./cognitive/accuracy";
import { scoreSpan, type SpanTrialResult } from "./cognitive/span";
import { scoreChoiceRt, scoreSymbolMatch, type RtTrialResult, type SymbolTrial } from "./cognitive/speed";
import { scoreLearning, type LearningTrial } from "./cognitive/learning";
import { scoreBalloon, type BalloonResult } from "./cognitive/balloon";
import { discountAuc } from "./cognitive/discount";
import { abilityFrom, CALIBRATION, memoryFrom, speedFrom } from "./cognitive/norms";
import type { Responses } from "./types";

/** Stored with each session's scores; sessions scored by an older version are re-scored from their stored answers. */
export const SCORING_VERSION = "lane-scoring-0.4 / package-0.1";

export type SessionData = {
  responses: LoggedResponse[];
  qsorts: Partial<Record<"WIL_SORT" | "LV_SORT", QSort>>;
  ideas: Record<string, string[]>;
  accuracy: Partial<Record<"matrix" | "number_series" | "letter_series" | "quant" | "rotation2d", AccuracyTrial[]>>;
  span: Partial<Record<"backward_digits" | "corsi", SpanTrialResult[]>>;
  symbol?: SymbolTrial[];
  choiceRt?: RtTrialResult[];
  learning?: LearningTrial[];
  balloon?: BalloonResult[];
  discount?: { delayDays: number; indifference: number }[];
};

export type ItemContext = {
  items: Map<string, BankItem>;
  antonymPairs: [string, string][];
  wilValueOf: Record<string, string>;
  wilMultipliers: Record<string, number>;
  lvScaleOf: Record<string, string>;
  psychometrics?: Record<string, Psychometric | null>;
};

export type SessionScores = {
  session: SessionId;
  version?: string;
  validity: ValidityResult;
  personality?: PersonalityScores;
  interests?: InterestScores;
  values?: ValueScore[];
  cognitive?: {
    accuracy: Partial<Record<string, AccuracyScore>>;
    span: Partial<Record<string, ReturnType<typeof scoreSpan>>>;
    symbolMatch?: ReturnType<typeof scoreSymbolMatch>;
    learning?: ReturnType<typeof scoreLearning>;
    balloon?: ReturnType<typeof scoreBalloon>;
    discountAuc?: number | null;
  };
  /** Experimental or not-yet-scoreable content. Stored for the pilot; never shown. */
  hidden: Record<string, unknown>;
};


export function scoreSession(session: SessionId, data: SessionData, ctx: ItemContext): SessionScores {
  const r: Responses = Object.fromEntries(data.responses.map((x) => [x.itemId, x.value]));
  const items = (module: string) => [...ctx.items.values()].filter((i) => i.module === module);
  const out: SessionScores = { session, version: SCORING_VERSION, validity: checkValidity(data.responses, ctx.items, ctx.antonymPairs), hidden: {} };

  if (session === "S1") {
    out.interests = scoreInterests(items("03_interests_onet_ip_short_form"), r, ctx.psychometrics);
    if (data.qsorts.WIL_SORT) out.values = scoreWil(data.qsorts.WIL_SORT, ctx.wilValueOf, ctx.wilMultipliers);
    out.hidden.interestExtension = scoreInterestExtension(items("04_interests_lane_extension"), r);
    if (data.qsorts.LV_SORT) out.hidden.valuesExtension = scoreValuesExtension(data.qsorts.LV_SORT, ctx.lvScaleOf);
  }
  if (session === "S2") {
    out.personality = scorePersonality(items("01_personality_ipip_neo_120"), items("02_personality_honesty_humility"), r, ctx.psychometrics);
    out.hidden.dispositions = scoreDispositions(items("07_lane_dispositions"), r);
  }
  if (session === "S3" || session === "S4") {
    out.cognitive = {
      accuracy: Object.fromEntries(Object.entries(data.accuracy).map(([k, v]) => [k, scoreAccuracy(v!)])),
      span: Object.fromEntries(Object.entries(data.span).map(([k, v]) => [k, scoreSpan(v!)])),
      symbolMatch: data.symbol ? scoreSymbolMatch(data.symbol) : undefined,
      learning: data.learning ? scoreLearning(data.learning) : undefined,
      balloon: data.balloon ? scoreBalloon(data.balloon) : undefined,
      discountAuc: data.discount ? discountAuc(data.discount, 1000) : undefined,
    };
    if (data.choiceRt) out.hidden.choiceRt = scoreChoiceRt(data.choiceRt);
  }
  if (session === "S5") {
    out.hidden.sjt = scoreSjt(items("08_emotional_intelligence_sjt"), r);
    out.hidden.ideas = Object.fromEntries(Object.entries(data.ideas).map(([k, v]) => [k, scoreIdeas(v)]));
    out.hidden.biodata = Object.fromEntries(data.responses.filter((x) => x.itemId.startsWith("BIO_")).map((x) => [x.itemId, x.value]));
    out.hidden.outcomesBaseline = Object.fromEntries(data.responses.filter((x) => x.itemId.startsWith("OUT_")).map((x) => [x.itemId, x.value]));
  }
  return out;
}

/* --------------------------------------------------------------------------
   Profile: what results pages render
   -------------------------------------------------------------------------- */

export type ReasoningAreaId = "reasoning" | "spatial" | "quantitative" | "memory" | "speed";

export type ReasoningArea = {
  id: ReasoningAreaId;
  label: string;
  /** Raw performance summary, always available after S3/S4. */
  summary: string;
  /** Population-referenced score from the provisional calibration (PLAN D50); null if not enough data. */
  normed: Normed | null;
  /** How far to trust `normed`: "moderate" when anchored in published data, "low" when model-estimated only. */
  normConfidence?: "moderate" | "low";
};

export type ProfileScores = {
  scoringVersion: string;
  norms: { status: "provisional" | "pending"; note: string };
  sessions: { id: SessionId; completedAt: string | null; confidence: "ok" | "low" | null; flags: string[] }[];
  personality: PersonalityScores | null;
  interests: InterestScores | null;
  values: ValueScore[] | null;
  reasoning: {
    /** BLUEPRINT §7 / file 14: a percentile band with a 90% interval, never an IQ number. */
    generalAbility: { percentileBand: [number, number] } | null;
    /** Where the reasoning norms come from. */
    norms: { source: string; provisional: boolean } | null;
    areas: ReasoningArea[];
  } | null;
  behaviour: {
    learning: { relativeRate: number | null; accuracySlope: number | null } | null;
    risk: { adjustedPumps: number | null; lossReactivity: number | null } | null;
    patience: { auc: number | null } | null;
  } | null;
  completeness: { partial: boolean; missing: string[] };
};

const SESSION_UNLOCKS: Record<SessionId, string> = {
  S1: "Interests and work values",
  S2: "Personality",
  S3: "Reasoning (part 1 of 2)",
  S4: "Reasoning (part 2 of 2), learning, risk and patience",
  S5: "Judgment, ideas and history",
};

export function buildProfile(
  scored: Partial<Record<SessionId, { scores: SessionScores; completedAt: string }>>,
  normsStatus: ProfileScores["norms"]["status"] = "pending",
): ProfileScores {
  const s1 = scored.S1?.scores;
  const s2 = scored.S2?.scores;
  const s3 = scored.S3?.scores.cognitive;
  const s4 = scored.S4?.scores.cognitive;
  const reasoningReady = !!(s3 && s4);
  const missing = (Object.keys(SESSION_UNLOCKS) as SessionId[]).filter((id) => !scored[id]).map((id) => `${id} · ${SESSION_UNLOCKS[id]}`);

  return {
    scoringVersion: SCORING_VERSION,
    norms: {
      status: normsStatus,
      note:
        normsStatus === "provisional"
          ? "Compared with published norms. Provisional until Lane has its own norm sample."
          : "Norm tables not yet loaded: scores shown without percentiles.",
    },
    sessions: (Object.keys(SESSION_UNLOCKS) as SessionId[]).map((id) => ({
      id,
      completedAt: scored[id]?.completedAt ?? null,
      confidence: scored[id]?.scores.validity.confidence ?? null,
      flags: scored[id]?.scores.validity.flags.map((f) => f.label) ?? [],
    })),
    personality: s2?.personality ?? null,
    interests: s1?.interests ?? null,
    values: s1?.values ?? null,
    reasoning: reasoningReady ? reasoningProfile(s3!, s4!) : null,
    behaviour: s4
      ? {
          learning: s4.learning ? { relativeRate: s4.learning.relativeRate, accuracySlope: s4.learning.accuracySlope } : null,
          risk: s4.balloon ? { adjustedPumps: s4.balloon.adjustedPumps, lossReactivity: s4.balloon.lossReactivity } : null,
          patience: s4.discountAuc !== undefined ? { auc: s4.discountAuc ?? null } : null,
        }
      : null,
    completeness: { partial: !(s1 && s2 && reasoningReady && scored.S5), missing },
  };
}

type Cognitive = NonNullable<SessionScores["cognitive"]>;

/**
 * Reasoning areas with population-referenced scores (PLAN D50): accuracy tasks by 3PL ability
 * estimate from the provisional difficulty table, memory and speed from the provisional norms.
 * Choice RT stays hidden (file 14: within-person only).
 */
function reasoningProfile(s3: Cognitive, s4: Cognitive): NonNullable<ProfileScores["reasoning"]> {
  const pct = (a?: AccuracyScore) => (a?.proportion !== null && a?.proportion !== undefined ? `${Math.round(a.proportion * 100)}% correct (${a.scored} items)` : "Not completed");
  const lv = (a?: AccuracyScore) => a?.byLevel;
  const general = abilityFrom({
    matrix: lv(s3.accuracy.matrix),
    number_series: lv(s3.accuracy.number_series),
    letter_series: lv(s3.accuracy.letter_series),
    rotation2d: lv(s3.accuracy.rotation2d),
    quant: lv(s4.accuracy.quant),
  });
  const digit = s3.span.backward_digits?.span;
  const corsi = s4.span.corsi?.span;
  return {
    generalAbility: general ? { percentileBand: general.percentileBand } : null,
    norms: { source: `Provisional: item difficulties and norms estimated offline by ${CALIBRATION.model} (${CALIBRATION.date}), not yet checked against Lane's own pilot data.`, provisional: true },
    areas: [
      {
        id: "reasoning",
        label: "Reasoning",
        summary: [s3.accuracy.matrix, s3.accuracy.number_series, s3.accuracy.letter_series].map(pct).join(" · "),
        normed: abilityFrom({ matrix: lv(s3.accuracy.matrix), number_series: lv(s3.accuracy.number_series), letter_series: lv(s3.accuracy.letter_series) }),
        normConfidence: "low",
      },
      { id: "spatial", label: "Spatial", summary: pct(s3.accuracy.rotation2d), normed: abilityFrom({ rotation2d: lv(s3.accuracy.rotation2d) }), normConfidence: "low" },
      { id: "quantitative", label: "Quantitative", summary: pct(s4.accuracy.quant), normed: abilityFrom({ quant: lv(s4.accuracy.quant) }), normConfidence: "low" },
      // Corsi is anchored in published norms (Kessels et al., 2000); digit span is model-estimated only.
      { id: "memory", label: "Memory", summary: `Digit span ${digit ?? "–"} · Corsi span ${corsi ?? "–"}`, normed: memoryFrom(digit, corsi), normConfidence: digit === undefined ? "moderate" : "low" },
      { id: "speed", label: "Speed", summary: s4.symbolMatch ? `${s4.symbolMatch.score} net correct in 90 s` : "Not completed", normed: speedFrom(s4.symbolMatch?.score), normConfidence: "low" },
    ],
  };
}
