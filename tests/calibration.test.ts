import { describe, expect, it } from "vitest";
import { A_RANGE, blendNorm, bootstrapSeB, clampP, fit3pl, fitTask, iqr, isotonic, median, pCorrect, quantile, sdBWithin, type Call } from "@assessment/calibration/fit";
import { calibrationItems, describeCell } from "@assessment/calibration/render";
import { CONFIGURATIONS, ITEMS_PER_CONFIG, LITERATURE_ANCHORS } from "@assessment/calibration/config";

/** Probabilities a true 3PL item would produce at θ = −1, 0, +1. */
const elicit = (a: number, b: number, c: number) => ({ p16: pCorrect(-1, a, b, c), p50: pCorrect(0, a, b, c), p84: pCorrect(1, a, b, c) });

describe("fit3pl", () => {
  it("recovers a and b exactly from points on a 3PL curve", () => {
    for (const [a, b, c] of [[1.2, 0.5, 0.2], [0.8, -1.3, 1 / 8], [2, 1.1, 0.25]] as const) {
      const f = fit3pl(elicit(a, b, c), c);
      expect(f.a).toBeCloseTo(a, 9);
      expect(f.b).toBeCloseTo(b, 9);
    }
  });

  it("clamps probabilities into (c + 0.01, 0.99) so extreme answers stay finite", () => {
    expect(clampP(0.05, 0.2)).toBeCloseTo(0.21, 12);
    expect(clampP(1, 0.2)).toBe(0.99);
    const f = fit3pl({ p16: 0, p50: 0.5, p84: 1 }, 0.2);
    expect(Number.isFinite(f.a) && Number.isFinite(f.b)).toBe(true);
  });

  it("clips a to [0.4, 2.5] and refits b for the clipped slope", () => {
    const steep = fit3pl({ p16: 0.21, p50: 0.6, p84: 0.99 }, 0.2);
    expect(steep.a).toBe(A_RANGE[1]);
    expect(steep.aUnclipped).toBeGreaterThan(A_RANGE[1]);
    const flat = fit3pl({ p16: 0.5, p50: 0.52, p84: 0.54 }, 0.2);
    expect(flat.a).toBe(A_RANGE[0]);
    // b is the least-squares b for the clipped a: −mean(y)/a
    const y = [0.5, 0.52, 0.54].map((p) => Math.log((p - 0.2) / 0.8 / (1 - (p - 0.2) / 0.8)));
    expect(flat.b).toBeCloseTo(-(y[0]! + y[1]! + y[2]!) / 3 / A_RANGE[0], 9);
  });
});

describe("summaries", () => {
  it("median, quantile and IQR", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2);
    expect(iqr([0.2, 0.3, 0.6, 0.7])).toBeCloseTo(0.625 - 0.275, 12);
  });

  it("isotonic regression pools adjacent violators", () => {
    expect(isotonic([1, 3, 2, 4])).toEqual([1, 2.5, 2.5, 4]);
    expect(isotonic([0, 1, 2])).toEqual([0, 1, 2]);
    expect(isotonic([3, 2, 1])).toEqual([2, 2, 2]);
  });

  it("bootstrap se of b is 0 when calls agree, positive when they don't, and reproducible", () => {
    const same = Array(12).fill(elicit(1, 0.3, 0.2));
    expect(bootstrapSeB(same, 0.2, 500, 1)).toBeCloseTo(0, 12);
    const spread = [-0.8, -0.3, 0, 0.2, 0.5, 1.1].map((b) => elicit(1, b, 0.2));
    const se1 = bootstrapSeB(spread, 0.2, 500, 7);
    expect(se1).toBeGreaterThan(0.05);
    expect(bootstrapSeB(spread, 0.2, 500, 7)).toBe(se1);
  });

  it("sd_b_within is the spread of per-item difficulties", () => {
    const calls: Call[] = [0, 1].flatMap((repeat) => [-1, 0, 1].map((b, i) => ({ ...elicit(1, b, 0.2), itemId: `i${i}`, repeat })));
    expect(sdBWithin(calls, 0.2)).toBeCloseTo(1, 9);
  });
});

describe("fitTask", () => {
  const callsFor = (b: number, p50Jitter = 0): Call[] =>
    Array.from({ length: 12 }, (_, k) => ({ ...elicit(1.2, b + (k % 2 ? 0.05 : -0.05), 0.2), p50: elicit(1.2, b, 0.2).p50 + (k % 2 ? p50Jitter : -p50Jitter), itemId: `i${k % 6}`, repeat: k < 6 ? 0 : 1 }));

  it("keeps b increasing with level and flags levels it had to merge", () => {
    const fits = fitTask(
      [
        { level: 1, c: 0.2, calls: callsFor(-1) },
        { level: 2, c: 0.2, calls: callsFor(0.4) },
        { level: 3, c: 0.2, calls: callsFor(0.1) }, // estimated easier than level 2
      ],
      { samples: 300, seed: 3 },
    );
    expect(fits.map((f) => f.b)).toEqual([...fits.map((f) => f.b)].sort((x, y) => x - y));
    expect(fits[2]!.flags.join()).toMatch(/adjusted to keep levels in order/);
    expect(fits[2]!.flags.join()).toMatch(/not clearly separated from level 2/);
    expect(fits[1]!.flags.join()).not.toMatch(/not clearly separated/);
  });

  it("flags configurations where calls disagree (IQR of p50 > 0.25)", () => {
    const fits = fitTask([{ level: 1, c: 0.2, calls: callsFor(0, 0.2) }], { samples: 100, seed: 1 });
    expect(fits[0]!.iqrP50).toBeGreaterThan(0.25);
    expect(fits[0]!.flags.join()).toMatch(/calls disagree/);
  });
});

describe("norms", () => {
  it("blends Corsi 0.7 literature / 0.3 Claude", () => {
    const corsi = LITERATURE_ANCHORS.corsi!;
    expect(blendNorm({ mean: 5.2, sd: 1.0 }, corsi)).toEqual({ mean: 0.7 * 6.2 + 0.3 * 5.2, sd: 0.7 * 1.3 + 0.3 * 1.0 });
    expect(blendNorm({ mean: 5.2, sd: 1.0 })).toEqual({ mean: 5.2, sd: 1.0 });
  });
});

describe("calibration items", () => {
  const items = calibrationItems();
  it("6 fixed-seed items per configuration, each with its answer and time limit", () => {
    expect(items).toHaveLength(CONFIGURATIONS.length * ITEMS_PER_CONFIG);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const i of items) {
      expect(i.text).toMatch(/Correct answer: [A-H]/);
      expect(i.text).toMatch(/Time limit: \d+ seconds/);
    }
    expect(calibrationItems()).toEqual(items);
  });

  it("describes matrix cells in words", () => {
    expect(describeCell({ shape: 2, count: 2, fill: 2, rotation: 1 })).toBe("2 solid triangles rotated 45°");
    expect(describeCell({ shape: 0, count: 1, fill: 0, rotation: 0 })).toBe("1 empty (outline only) circle upright");
  });
});
