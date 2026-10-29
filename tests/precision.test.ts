/**
 * Precision pass steps 2–5 (matching v2-0.5): work values by order statistics, the environment
 * cap, the new weights with validation multipliers, the weight ensemble, and the config registry
 * that keeps v2-0.3 and v2-0.4 selectable.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_V2_VERSION, LANE_PROFILES_V2, V2_CONFIGS, effectiveWeights, envGuardFor, matchV2, offsetsFor, selectConfig, type V2Config } from "@/lib/matching/v2";
import { synthetic, TEST_PROFILES } from "@/lib/matching/v2/synthetic";
import { ORDER_STATS_6, VALUES_SHRINKAGE, personInputs, valueEstimates } from "@/lib/workdesign/person";
import { normalCdf } from "@/lib/scoring/core";
import { sampleProfile } from "@/lib/mock/profile";

const V3 = V2_CONFIGS["v2-0.3"]!;
const V4 = V2_CONFIGS["v2-0.4"]!;
const V5 = V2_CONFIGS["v2-0.5"]!;

describe("work values by expected normal order statistics (step 2)", () => {
  it("maps ranks 1–6 to Φ(0.7 × the order statistic), symmetric about 50", () => {
    const est = valueEstimates([60, 50, 40, 30, 20, 10], "orderStats");
    expect(est[0]).toBeCloseTo(normalCdf(VALUES_SHRINKAGE * 1.267) * 100, 6);
    expect(est[0]).toBeCloseTo(81.2, 1);
    expect(est[2]).toBeCloseTo(normalCdf(0.7 * 0.202) * 100, 6);
    for (let i = 0; i < 3; i++) expect(est[i]! + est[5 - i]!).toBeCloseTo(100, 6);
    expect(ORDER_STATS_6).toEqual([1.267, 0.642, 0.202, -0.202, -0.642, -1.267]);
    // The order follows the scores, wherever they sit in the list.
    const shuffled = valueEstimates([20, 60, 10, 40, 50, 30], "orderStats");
    expect(shuffled[1]).toBeCloseTo(est[0]!, 9);
    expect(shuffled[2]).toBeCloseTo(est[5]!, 9);
  });

  it("gives tied values the average of the order statistics they span", () => {
    const est = valueEstimates([9, 9, 5, 4, 3, 1], "orderStats");
    const tied = normalCdf(0.7 * ((1.267 + 0.642) / 2)) * 100;
    expect(est[0]).toBeCloseTo(tied, 6);
    expect(est[1]).toBeCloseTo(tied, 6);
    expect(valueEstimates([5, 5, 5, 5, 5, 5], "orderStats").every((x) => Math.abs(x - 50) < 1e-4)).toBe(true);
  });

  it("keeps min–max for the older configs, and uses each config's rule for a real profile", () => {
    expect(valueEstimates([60, 50, 40, 30, 20, 10], "minmax")).toEqual([100, 80, 60, 40, 20, 0]);
    const old = personInputs(sampleProfile, V4.inputs);
    const now = personInputs(sampleProfile, V5.inputs);
    const vals = (x: typeof old) => Object.entries(x).filter(([k]) => k.startsWith("values.")).map(([, e]) => e!.value);
    expect(Math.max(...vals(old))).toBe(100);
    expect(Math.min(...vals(old))).toBe(0);
    expect(Math.max(...vals(now))).toBeLessThan(82);
    expect(Math.min(...vals(now))).toBeGreaterThan(18);
  });

  it("anchors interests under v2-0.4 even where norms exist, and norms them under v2-0.5", () => {
    expect(personInputs(sampleProfile, V4.inputs)["interests.R"]!.provenance).toBe("anchored");
    expect(personInputs(sampleProfile, V5.inputs)["interests.R"]!.provenance).toBe("normed");
  });
});

describe("config registry", () => {
  it("keeps v2-0.3 and v2-0.4 selectable, and defaults to v2-0.5", () => {
    expect(Object.keys(V2_CONFIGS)).toEqual(["v2-0.3", "v2-0.4", "v2-0.5"]);
    expect(DEFAULT_V2_VERSION).toBe("v2-0.5");
    expect(selectConfig(undefined).version).toBe("v2-0.5");
    expect(selectConfig("v2-0.3")).toBe(V3);
    expect(() => selectConfig("v2-9")).toThrow(/not one of/);
    expect(V3.weights.strengths).toBe(0);
    expect([V3, V4].every((c) => c.envCap === null && c.ensemble === null && !c.inputs.norms && c.inputs.values === "minmax")).toBe(true);
    for (const c of Object.values(V2_CONFIGS)) expect(Object.keys(offsetsFor(c)).length).toBe(205);
    // v2-0.3 runs on the offsets it was released with (frozen), not ones rebuilt from today's code.
    expect(offsetsFor(V3).b2b_sales).toEqual({ environment: -0.0679, challenge: 0.0577 });
  });

  it("has the step 4 weights and a validation status for every component", () => {
    expect(V5.weights).toEqual({ interests: 0.45, values: 0.2, valueModes: 0.15, environment: 0.1, challenge: 0.1, strengths: 0.08 });
    expect(V5.weights.interests + V5.weights.values + V5.weights.valueModes + V5.weights.environment + V5.weights.challenge).toBeCloseTo(1, 10);
    expect(Object.keys(V5.validationStatus).sort()).toEqual(Object.keys(V5.weights).sort());
    expect(V5.validationStatus.interests).toBe("validated");
  });

  it("applies the validation multipliers and renormalises over the components present", () => {
    const five = effectiveWeights(V5, ["interests", "values", "valueModes", "environment", "challenge"]);
    expect(five.interests).toBeCloseTo(0.45, 10);
    expect(five.strengths).toBe(0);
    const halved: V2Config = { ...V5, validationMultiplier: { ...V5.validationMultiplier, derived: 0.5 } };
    const w = effectiveWeights(halved, ["interests", "values", "valueModes", "environment", "challenge"]);
    // Derived components (modes, environment, challenge: 0.35 together) are halved, then all renormalise.
    expect(w.interests).toBeCloseTo(0.45 / (0.65 + 0.175), 10);
    expect(w.valueModes).toBeCloseTo(0.075 / (0.65 + 0.175), 10);
  });

  it("reproduces v2-0.4 exactly when it is selected", () => {
    const p = synthetic(TEST_PROFILES.hunter!.spec);
    const a = matchV2(p, { config: V4, draws: 40 });
    expect(a.version).toBe("v2-0.4");
    expect(a.envGuard).toEqual([]);
    expect(a.lanes.every((l) => l.pBy === undefined)).toBe(true);
  });
});

describe("environment cap (step 3)", () => {
  // Strong need for autonomy (Independence first, low orderliness), little else: autonomy would carry a third of some fits.
  const lopsided = synthetic({ interests: { I: 55 }, values: { Independence: 100 }, facets: { C2: 0 } }, V5.inputs);
  const r = matchV2(lopsided, { config: V5, draws: 60 });

  it("caps every environment dimension (and challenge) at 15% of every fit, reporting before and after", () => {
    expect(r.envGuard.map((g) => g.dimension)).toHaveLength(8);
    const autonomy = r.envGuard.find((g) => g.dimension === "autonomy")!;
    expect(autonomy.maxShareBefore).toBeGreaterThan(V5.envCap! + 0.03);
    expect(autonomy.scale).toBeLessThan(1);
    for (const g of r.envGuard) expect(g.maxShareAfter, g.dimension).toBeLessThanOrEqual(V5.envCap! + 0.005);
    // A dimension is shrunk only as far as the cap: it ends at the cap, not below it. (One under the cap
    // at first can still need shrinking, once shrinking another has made the totals smaller.)
    for (const g of r.envGuard) if (g.scale < 1) expect(g.maxShareAfter, g.dimension).toBeGreaterThan(V5.envCap! - 0.01);
  });

  it("holds the cap under flat environment weighting too (the ensemble's flat draws get their own guard)", () => {
    const flat: V2Config = { ...V5, envWeighting: "flat" };
    for (const k of ["analyst", "hunter"]) {
      const g = envGuardFor(synthetic(TEST_PROFILES[k]!.spec, V5.inputs), LANE_PROFILES_V2, flat, offsetsFor(V5));
      for (const x of g) expect(x.maxShareAfter, `${k} ${x.dimension}`).toBeLessThanOrEqual(V5.envCap! + 0.005);
    }
  });

  it("holds the cap on the six test profiles", () => {
    for (const [k, t] of Object.entries(TEST_PROFILES)) {
      const m = matchV2(synthetic(t.spec, V5.inputs), { config: V5, draws: 20 });
      for (const g of m.envGuard) expect(g.maxShareAfter, `${k} ${g.dimension}`).toBeLessThanOrEqual(V5.envCap! + 0.005);
    }
  });
});

describe("weight ensemble (step 5)", () => {
  const p = synthetic(TEST_PROFILES.analyst!.spec, V5.inputs);
  const r = matchV2(p, { config: V5, draws: 200 });

  it("splits the draws between need-weighted and flat environment weighting", () => {
    const l = r.lanes[0]!;
    expect(l.pBy).toBeDefined();
    // The overall share is the draw-weighted mean of the two.
    for (const x of r.lanes) {
      expect(x.pTop).toBeGreaterThanOrEqual(Math.min(x.pBy!.need.top, x.pBy!.flat.top) - 0.002);
      expect(x.pTop).toBeLessThanOrEqual(Math.max(x.pBy!.need.top, x.pBy!.flat.top) + 0.002);
    }
  });

  it("calls a career strong (or unlikely) only when it is under both weightings, and shows that share", () => {
    for (const x of r.lanes) {
      expect(x.pTopBand).toBeCloseTo(Math.min(x.pBy!.need.top, x.pBy!.flat.top), 3);
      expect(x.band === "strong").toBe(x.pTopBand! >= V5.bands.strong);
      if (x.band === "strong") expect(Math.min(x.pBy!.need.top, x.pBy!.flat.top)).toBeGreaterThanOrEqual(V5.bands.strong);
      if (x.band === "unlikely") expect(Math.min(x.pBy!.need.bottom, x.pBy!.flat.bottom)).toBeGreaterThanOrEqual(V5.bands.unlikely);
    }
    expect(r.bandCounts.strong).toBeGreaterThan(5);
  });

  it("is deterministic, and draws the same input noise as without the ensemble", () => {
    expect(matchV2(p, { config: V5, draws: 200 }).lanes.map((l) => l.pTop)).toEqual(r.lanes.map((l) => l.pTop));
    // With no weight variation (huge concentration) and never flat, the ensemble is a no-op.
    const still: V2Config = { ...V5, ensemble: { concentration: 1e9, flatEnvShare: 0 } };
    const off: V2Config = { ...V5, ensemble: null };
    const a = matchV2(p, { config: still, draws: 60 }).lanes.map((l) => l.fulfilmentFit.mean);
    const b = matchV2(p, { config: off, draws: 60 }).lanes.map((l) => l.fulfilmentFit.mean);
    a.forEach((x, i) => expect(Math.abs(x - b[i]!)).toBeLessThan(0.15));
  });
});
