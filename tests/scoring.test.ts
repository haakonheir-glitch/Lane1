import { describe, expect, test } from "vitest";
import { itemIndex, sessionPlan, ACQUIESCENCE_PAIRS, WIL_MULTIPLIERS, WIL_VALUE_OF, LV_SCALE_OF } from "@/lib/bank/bank";
import { diffSE, isClearDifference, keyed, meanIfEnough, normalCdf, normed, sem } from "@/lib/scoring/core";
import { scorePersonality } from "@/lib/scoring/personality";
import { scoreInterests } from "@/lib/scoring/interests";
import { scoreWil, validateSort } from "@/lib/scoring/values";
import { scoreDispositions, scoreIdeas, scoreSjt } from "@/lib/scoring/experimental";
import { checkValidity, effortAction, type LoggedResponse } from "@/lib/scoring/validity";
import { isRapidGuess, markRotation, scoreAccuracy } from "@/lib/scoring/cognitive/accuracy";
import { markSpan, nextSpanLength, scoreSpan } from "@/lib/scoring/cognitive/span";
import { scoreChoiceRt, scoreSymbolMatch } from "@/lib/scoring/cognitive/speed";
import { fitLog, scoreLearning } from "@/lib/scoring/cognitive/learning";
import { scoreBalloon } from "@/lib/scoring/cognitive/balloon";
import { discountAuc } from "@/lib/scoring/cognitive/discount";
import { relativeStrengths } from "@/lib/scoring/relative";
import { buildProfile, scoreSession } from "@/lib/scoring/profile";
import { CORSI_LAYOUT, CORSI_PROTOCOL, SPAN_PROTOCOL, generateCorsi } from "@assessment/generators/generators";
import type { BankItem } from "@/lib/bank/types";

const items = (module: string) => [...itemIndex.values()].filter((i) => i.module === module);
const neoItems = items("01_personality_ipip_neo_120");
const hhItems = items("02_personality_honesty_humility");
const onetItems = items("03_interests_onet_ip_short_form");

describe("core", () => {
  test("reverse keying: key −1 → 6 − response", () => {
    expect(keyed(5, -1)).toBe(1);
    expect(keyed(2, -1)).toBe(4);
    expect(keyed(4, 1)).toBe(4);
  });
  test("minimum answered", () => {
    expect(meanIfEnough([4, 4, null, null], 3)).toBeNull();
    expect(meanIfEnough([4, 2, 3, null], 3)).toBe(3);
  });
  test("SEM and the blueprint's worked example", () => {
    // BLUEPRINT §7: reliability .70 → SEM ≈ 0.55 SD; 90% interval ≈ ±0.9 SD.
    expect(sem(1, 0.7)).toBeCloseTo(0.548, 3);
    expect(1.645 * sem(1, 0.7)).toBeCloseTo(0.9, 1);
  });
  test("difference test: two scales with r = .75 need ≈ 1.4 SD", () => {
    expect(diffSE(0.75, 0.75)).toBeCloseTo(0.707, 3);
    expect(isClearDifference(1.3, 0.75, 0, 0.75)).toBe(false);
    expect(isClearDifference(1.45, 0.75, 0, 0.75)).toBe(true);
  });
  test("normal CDF", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
  });
  test("normed: T, 90% interval and percentile band", () => {
    const n = normed(4, { mean: 3, sd: 1, reliability: 0.75 });
    expect(n.z).toBe(1);
    expect(n.t).toBe(60);
    expect(n.ci[1] - n.ci[0]).toBeCloseTo(2 * 1.645 * 10 * Math.sqrt(0.25), 6);
    expect(n.percentile).toBe(84);
  });
});

describe("personality (file 01/02)", () => {
  test("29 facets, 5 domains; Openness from O1–O5 only", () => {
    const s = scorePersonality(neoItems, hhItems, {});
    expect(s.facets).toHaveLength(29);
    expect(s.facets.find((f) => f.id === "O6")).toBeUndefined();
    expect(s.domains.find((d) => d.id === "Openness")!.items).toBe(20);
  });
  test("facet needs ≥ 3 of 4 answered", () => {
    const anx = neoItems.filter((i) => i.facet === "N1"); // all keyed +
    const two = Object.fromEntries(anx.slice(0, 2).map((i) => [i.id, 5]));
    expect(scorePersonality(neoItems, hhItems, two).facets.find((f) => f.id === "N1")!.raw).toBeNull();
    const three = Object.fromEntries(anx.slice(0, 3).map((i) => [i.id, 4]));
    expect(scorePersonality(neoItems, hhItems, three).facets.find((f) => f.id === "N1")!.raw).toBe(4);
  });
  test("reverse-keyed items flip (C2 Orderliness has −1 items)", () => {
    const ord = neoItems.filter((i) => i.facet === "C2");
    // Answer 5 to every item: + items score 5, − items score 1.
    const r = Object.fromEntries(ord.map((i) => [i.id, 5]));
    const plus = ord.filter((i) => i.key === 1).length;
    const expected = (plus * 5 + (ord.length - plus) * 1) / ord.length;
    expect(scorePersonality(neoItems, hhItems, r).facets.find((f) => f.id === "C2")!.raw).toBeCloseTo(expected, 6);
  });
  test("Honesty-Humility: all four items reversed", () => {
    const r = Object.fromEntries(hhItems.map((i) => [i.id, 1]));
    expect(scorePersonality(neoItems, hhItems, r).honestyHumility!.raw).toBe(5);
  });
  test("no norms → no normed score (no invented percentiles)", () => {
    const r = Object.fromEntries([...neoItems, ...hhItems].map((i) => [i.id, 3]));
    expect(scorePersonality(neoItems, hhItems, r, {}).facets.every((f) => f.normed === null)).toBe(true);
    // With the published table: every facet and domain is normed; Honesty-Humility has no norm yet.
    const p = scorePersonality(neoItems, hhItems, r);
    expect([...p.facets, ...p.domains].every((f) => f.normed)).toBe(true);
    expect(p.honestyHumility!.normed).toBeNull();
  });
});

describe("interests (file 03)", () => {
  const all = (fn: (i: BankItem) => number) => Object.fromEntries(onetItems.map((i) => [i.id, fn(i)]));
  test("sum of 10 (10–50), like-count, Holland code, differentiation, elevation", () => {
    const order = { R: 1, I: 2, A: 3, S: 4, E: 5, C: 2 } as Record<string, number>;
    const s = scoreInterests(onetItems, all((i) => order[i.scale!]!));
    expect(s.scales.find((x) => x.code === "E")!.raw).toBe(50);
    expect(s.scales.find((x) => x.code === "R")!.raw).toBe(10);
    expect(s.scales.find((x) => x.code === "S")!.likeCount).toBe(10);
    expect(s.hollandCode).toBe("ESA");
    expect(s.differentiation).toBe(40);
    expect(s.elevation).toBeCloseTo((10 + 20 + 30 + 40 + 50 + 20) / 6, 6);
  });
  test("flat profile: low differentiation flagged, no forced code", () => {
    const s = scoreInterests(onetItems, all(() => 3));
    expect(s.lowDifferentiation).toBe(true);
    expect(s.hollandCode).toBeNull();
  });
  test("validity item INST2 is not scored as an interest", () => {
    const withInst = sessionPlan("S1").blocks.flatMap((b) => b.items).filter((i) => i.module === "03_interests_onet_ip_short_form" || i.id === "INST2");
    const s = scoreInterests(withInst, { ...all(() => 3), INST2: 5 });
    expect(s.scales.find((x) => x.code === "C")!.raw).toBe(30);
  });
});

describe("work values (file 05)", () => {
  const cards = Object.keys(WIL_VALUE_OF);
  test("validates exactly four cards per column", () => {
    const sort = Object.fromEntries(cards.map((c, i) => [c, 5 - Math.floor(i / 4)]));
    expect(validateSort(sort, cards, [4, 4, 4, 4, 4], [5, 4, 3, 2, 1])).toBeNull();
    expect(validateSort({ ...sort, [cards[0]!]: 1 }, cards, [4, 4, 4, 4, 4], [5, 4, 3, 2, 1])).toMatch(/needs 4/);
  });
  test("value score = Σ card scores × multiplier", () => {
    // Achievement cards (A, F) in column 5, every other card in column 3 (capacity not enforced here).
    const sort = Object.fromEntries(cards.map((c) => [c, WIL_VALUE_OF[c] === "Achievement" ? 5 : 3]));
    const s = scoreWil(sort, WIL_VALUE_OF, WIL_MULTIPLIERS);
    expect(s.find((v) => v.id === "Achievement")!.score).toBe((5 + 5) * 3);
    expect(s.find((v) => v.id === "Working Conditions")!.score).toBe(6 * 3 * 1);
    expect(s[0]!.id).toBe("Achievement");
  });
});

describe("experimental (hidden)", () => {
  test("dispositions: ≥ 5 of 6, hidden", () => {
    const d = items("07_lane_dispositions");
    const s = scoreDispositions(d, Object.fromEntries(d.map((i) => [i.id, 3])));
    expect(s).toHaveLength(10);
    expect(s.every((x) => x.visibility === "hidden" && x.raw === 3)).toBe(true);
  });
  test("SJT keyed scoring", () => {
    const sj = items("08_emotional_intelligence_sjt");
    const r = Object.fromEntries(sj.map((i) => [i.id, i.keyIndex!]));
    const s = scoreSjt(sj, r);
    expect(s.understanding.correct).toBe(12);
    expect(s.management.correct).toBe(6);
  });
  test("ideas: fluency counts distinct non-empty ideas", () => {
    expect(scoreIdeas(["Doorstop", "doorstop ", "", "Paperweight"]).fluency).toBe(2);
  });
  test("LV extension has a scale for every card", () => {
    expect(Object.keys(LV_SCALE_OF)).toHaveLength(12);
  });
});

describe("validity (file 12)", () => {
  const s2 = sessionPlan("S2");
  const order = s2.blocks.flatMap((b) => b.items.map((i) => ({ i, block: b.id })));
  const log = (fn: (i: BankItem, n: number) => number, rt = 4000): LoggedResponse[] =>
    order.filter((x) => x.i.format.type === "likert5").map((x, n) => ({ itemId: x.i.id, blockId: x.block, value: fn(x.i, n), rtMs: rt }));

  test("careful, varied answers: no flags", () => {
    const careful = log((i, n) => {
      if (i.validity?.kind === "infrequency") return 1;
      if (i.validity?.kind === "instructed") return i.validity.passIfEq;
      // Consistent person: agrees with + items, disagrees with − items, with a little variety.
      const base = (i.key ?? 1) === 1 ? 4 : 2;
      return base + (n % 3 === 0 ? (i.key === 1 ? 1 : -1) : 0);
    });
    const v = checkValidity(careful, itemIndex, ACQUIESCENCE_PAIRS as [string, string][]);
    expect(v.flags.map((f) => f.id)).toEqual([]);
    expect(v.confidence).toBe("ok");
  });
  test("straight-lining fast: longstring + page time + infrequency → low confidence", () => {
    const v = checkValidity(log(() => 4, 400), itemIndex, ACQUIESCENCE_PAIRS as [string, string][]);
    const ids = v.flags.map((f) => f.id);
    expect(ids).toContain("longstring");
    expect(ids).toContain("page_time");
    expect(ids.filter((x) => x.startsWith("infrequency:"))).toHaveLength(4);
    expect(ids.filter((x) => x.startsWith("instructed:"))).toHaveLength(1);
    expect(v.confidence).toBe("low");
  });
  test("skipped items are ignored", () => {
    const skipped = log(() => 3).map((r) => ({ ...r, value: null }));
    expect(checkValidity(skipped, itemIndex, []).flags).toEqual([]);
  });
  test("effort actions", () => {
    expect(effortAction(0)).toBe("keep");
    expect(effortAction(1)).toBe("offer_redo");
    expect(effortAction(2)).toBe("discard");
  });
});

describe("cognitive (file 14)", () => {
  test("rapid guesses are missing, not wrong", () => {
    const trials = [
      { correct: true, timedOut: false, rtMs: 20_000, timeLimitSec: 60 },
      { correct: false, timedOut: false, rtMs: 1_000, timeLimitSec: 60 }, // < 25% of 20% of 60 s = 3 s
      { correct: false, timedOut: true, rtMs: 60_000, timeLimitSec: 60 },
    ];
    expect(isRapidGuess(trials[1]!)).toBe(true);
    // A quick but genuine answer to an easy item counts.
    expect(isRapidGuess({ correct: true, timedOut: false, rtMs: 4_000, timeLimitSec: 60 })).toBe(false);
    const s = scoreAccuracy(trials);
    expect(s.rapidGuesses).toBe(1);
    expect(s.scored).toBe(2);
    expect(s.proportion).toBe(0.5);
  });
  test("rotation: both correct and no mirrors", () => {
    expect(markRotation([2, 0], [0, 2])).toBe(true);
    expect(markRotation([0], [0, 2])).toBe(false);
    expect(markRotation([0, 1, 2], [0, 2])).toBe(false);
  });
  test("span protocol: start 3, two per length, stop when both wrong", () => {
    const p = SPAN_PROTOCOL;
    expect(nextSpanLength([], p)).toBe(3);
    expect(nextSpanLength([{ length: 3, correct: true }], p)).toBe(3);
    expect(nextSpanLength([{ length: 3, correct: true }, { length: 3, correct: false }], p)).toBe(4);
    expect(nextSpanLength([{ length: 4, correct: false }, { length: 4, correct: false }], p)).toBeNull();
    const h = [
      { length: 3, correct: true }, { length: 3, correct: true },
      { length: 4, correct: true }, { length: 4, correct: false },
      { length: 5, correct: false }, { length: 5, correct: false },
    ];
    expect(scoreSpan(h)).toEqual({ span: 4, correctTrials: 3, trials: 6 });
    expect(markSpan([3, 2, 1], [3, 2, 1])).toBe(true);
  });
  test("Corsi: never longer than the board", () => {
    expect(CORSI_PROTOCOL.maxLength).toBe(CORSI_LAYOUT.length);
    expect(CORSI_PROTOCOL.maxLength).toBe(9);
    expect(SPAN_PROTOCOL.maxLength).toBe(10); // digit span keeps its own maximum
    expect(generateCorsi(7, 9).sequence).toHaveLength(9);
    expect(new Set(generateCorsi(7, 9).sequence).size).toBe(9);
    expect(() => generateCorsi(7, 10)).toThrow(RangeError);
    expect(() => generateCorsi(7, 0)).toThrow(RangeError);
    // The adaptive procedure stops at 9: after passing 9 there is no length 10.
    const h = [3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9].map((length) => ({ length, correct: true }));
    expect(nextSpanLength(h, CORSI_PROTOCOL)).toBeNull();
    // A session recorded before the fix, with a "length 10" pass, scores as 9.
    expect(scoreSpan([...h, { length: 10, correct: true }], CORSI_PROTOCOL.maxLength).span).toBe(9);
  });
  test("symbol match = correct − incorrect", () => {
    expect(scoreSymbolMatch([{ correct: true, rtMs: 900 }, { correct: true, rtMs: 900 }, { correct: false, rtMs: 900 }]).score).toBe(1);
  });
  test("choice RT excludes anticipations and is hidden", () => {
    const s = scoreChoiceRt([{ correct: true, rtMs: 50 }, { correct: true, rtMs: 300 }, { correct: true, rtMs: 400 }]);
    expect(s.medianRtMs).toBe(350);
    expect(s.visibility).toBe("hidden");
  });
  test("learning: fit a + b·log(block)", () => {
    const f = fitLog([1, 2, 3, 4, 5, 6].map((x) => ({ x, y: 0.5 + 0.2 * Math.log(x) })))!;
    expect(f.a).toBeCloseTo(0.5, 6);
    expect(f.b).toBeCloseTo(0.2, 6);
    const trials = [1, 2, 3, 4, 5, 6].flatMap((block) => Array.from({ length: 24 }, (_, i) => ({ block, correct: i < 8 + block * 2, rtMs: 900 - block * 50 })));
    const s = scoreLearning(trials);
    expect(s.accuracySlope!).toBeGreaterThan(0);
    expect(s.rtSlopeMs!).toBeLessThan(0);
  });
  test("balloon: adjusted pumps and loss reactivity", () => {
    const s = scoreBalloon([{ pumps: 10, burst: false }, { pumps: 20, burst: true }, { pumps: 6, burst: false }, { pumps: 12, burst: false }]);
    expect(s.adjustedPumps).toBeCloseTo((10 + 6 + 12) / 3, 6);
    expect(s.lossReactivity).toBeCloseTo(6 - (20 + 12) / 2, 6);
  });
  test("discounting AUC: perfectly patient = 1, steep = small", () => {
    const delays = [7, 30, 90, 365];
    expect(discountAuc(delays.map((d) => ({ delayDays: d, indifference: 1000 })), 1000)).toBeCloseTo(1, 6);
    expect(discountAuc(delays.map((d) => ({ delayDays: d, indifference: 100 })), 1000)!).toBeLessThan(0.2);
  });
});

describe("relative strengths (BLUEPRINT §7)", () => {
  test("small gaps are 'none'; only clear gaps count", () => {
    const r = relativeStrengths([
      { id: "a", z: 1.0, reliability: 0.75 },
      { id: "b", z: 0.4, reliability: 0.75 },
      { id: "c", z: 0.0, reliability: 0.75 },
    ]);
    expect(Object.values(r).every((x) => x === "none")).toBe(true);
    const r2 = relativeStrengths([
      { id: "a", z: 1.8, reliability: 0.8 },
      { id: "b", z: 0.0, reliability: 0.8 },
      { id: "c", z: 0.1, reliability: 0.8 },
    ]);
    expect(r2.a).toBe("strength");
    expect(r2.b).toBe("none");
  });
});

describe("session → profile", () => {
  const ctx = { items: itemIndex, antonymPairs: ACQUIESCENCE_PAIRS as [string, string][], wilValueOf: WIL_VALUE_OF, wilMultipliers: WIL_MULTIPLIERS, lvScaleOf: LV_SCALE_OF };
  test("S1 + S2 only → partial profile, experimental content hidden from the profile", () => {
    const resp = (module: string, v: number): LoggedResponse[] => items(module).map((i) => ({ itemId: i.id, blockId: module, value: v, rtMs: 3000 }));
    const s1 = scoreSession("S1", { responses: [...resp("03_interests_onet_ip_short_form", 4), ...resp("04_interests_lane_extension", 3)], qsorts: {}, ideas: {}, accuracy: {}, span: {} }, ctx);
    const s2 = scoreSession("S2", { responses: resp("01_personality_ipip_neo_120", 3), qsorts: {}, ideas: {}, accuracy: {}, span: {} }, ctx);
    expect(s1.hidden.interestExtension).toBeDefined();
    const p = buildProfile({ S1: { scores: s1, completedAt: "2026-10-01" }, S2: { scores: s2, completedAt: "2026-10-02" } });
    expect(p.completeness.partial).toBe(true);
    expect(p.completeness.missing).toHaveLength(3);
    expect(p.reasoning).toBeNull();
    expect(JSON.stringify(p)).not.toMatch(/interestExtension|dispositions|sjt/);
  });
});
