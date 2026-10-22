import { describe, expect, it } from "vitest";
import battery from "@assessment/items/14_cognitive_battery.json";
import { effectiveSlope, estimateTheta, normedFromZ, pCorrect, type LevelParams } from "@/lib/scoring/cognitive/irt";
import { abilityFrom, levelParams, memoryFrom, NORMS, speedFrom, type AccuracyTaskId } from "@/lib/scoring/cognitive/norms";
import { scoreAccuracy } from "@/lib/scoring/cognitive/accuracy";
import { sampleProfile } from "@/lib/mock/profile";

const P: LevelParams = { a: 1.2, b: 0, c: 0.2, sdBWithin: 0 };

describe("3PL ability estimate", () => {
  it("recovers θ from many responses at known probabilities", () => {
    for (const theta of [-1, 0, 1]) {
      const levels = [-1, 0, 1].map((b) => {
        const params = { ...P, b };
        return { params, scored: 2000, correct: Math.round(2000 * pCorrect(theta, params)) };
      });
      expect(estimateTheta(levels)!.theta).toBeCloseTo(theta, 1);
    }
  });

  it("more right answers give a higher estimate; all right or all wrong stays finite", () => {
    const at = (correct: number) => estimateTheta([{ params: P, correct, scored: 8 }])!;
    const thetas = [0, 2, 4, 6, 8].map((k) => at(k).theta);
    expect(thetas).toEqual([...thetas].sort((a, b) => a - b));
    expect(Number.isFinite(at(8).theta) && at(8).psd > 0).toBe(true);
    expect(estimateTheta([])).toBeNull();
  });

  it("spread of difficulty within a level flattens the slope", () => {
    expect(effectiveSlope({ ...P, sdBWithin: 0 })).toBe(1.2);
    expect(effectiveSlope({ ...P, sdBWithin: 0.5 })).toBeLessThan(1.2);
  });

  it("turns a z score and its error into a percentile band", () => {
    const n = normedFromZ(0, 0.5);
    expect(n.percentile).toBe(50);
    expect(n.percentileBand[0]).toBe(100 - n.percentileBand[1]);
    expect(n.reliability).toBeCloseTo(0.75, 12);
  });
});

describe("difficulty table", () => {
  it("has parameters for every level the battery presents", () => {
    for (const t of battery.tasks.filter((x) => ["matrix", "number_series", "letter_series", "quant", "rotation2d"].includes(x.id)))
      for (const level of (t as { phase1_ladder: number[] }).phase1_ladder) expect(levelParams(t.id as AccuracyTaskId, level), `${t.id}:${level}`).not.toBeNull();
  });

  it("scores span and speed against the norms", () => {
    expect(memoryFrom(NORMS.backward_digits!.mean, NORMS.corsi!.mean)!.z).toBeCloseTo(0, 12);
    expect(memoryFrom(null, NORMS.corsi!.mean + NORMS.corsi!.sd)!.z).toBeCloseTo(1, 12);
    expect(speedFrom(undefined)).toBeNull();
    expect(abilityFrom({ matrix: [{ level: 99, correct: 1, scored: 1 }] })).toBeNull();
  });
});

describe("accuracy by level", () => {
  it("counts per level, leaving out rapid guesses", () => {
    const t = (level: number, correct: boolean, rtMs = 20_000) => ({ correct, timedOut: false, rtMs, timeLimitSec: 60, level });
    const s = scoreAccuracy([t(1, true), t(1, false), t(2, true), t(2, true, 100)]);
    expect(s.byLevel).toEqual([
      { level: 1, correct: 1, scored: 2 },
      { level: 2, correct: 1, scored: 1 },
    ]);
  });
});

describe("profile", () => {
  it("gives every reasoning area and the general composite a provisional percentile band", () => {
    const r = sampleProfile.reasoning!;
    expect(r.norms?.provisional).toBe(true);
    expect(r.generalAbility?.percentileBand[0]).toBeLessThan(r.generalAbility!.percentileBand[1]);
    for (const a of r.areas) expect(a.normed, a.id).not.toBeNull();
  });
});
