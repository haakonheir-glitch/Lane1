/**
 * Precision pass step 1: published norms in PSYCHOMETRICS, applied when a profile is read, and the
 * Work Design inputs switching from anchored to normed on their own.
 */
import { describe, expect, it } from "vitest";
import { PSYCHOMETRICS, REQUIRED_KEYS, NORMS_STAMP, OPENNESS_WITH_O6, opennessWithoutO6 } from "@/lib/scoring/psychometrics";
import { applyNorms, normBasis } from "@/lib/scoring/norms";
import { scoreInterests } from "@/lib/scoring/interests";
import { itemIndex } from "@/lib/bank/bank";
import { personInputs } from "@/lib/workdesign/person";
import { buildReportFacts } from "@/lib/report/facts";
import type { ProfileScores } from "@/lib/scoring/profile";
import type { ScaleScore } from "@/lib/scoring/types";

const scale = (id: string, raw: number, range: [number, number]): ScaleScore => ({ id, label: id, raw, rawRange: range, answered: 4, items: 4, normed: null, visibility: "user" });

/** A profile as stored before any norm was transcribed: raw scores, normed null everywhere. */
function stored(): ProfileScores {
  return {
    scoringVersion: "test",
    norms: { status: "pending", note: "" },
    sessions: [],
    interests: {
      scales: (["R", "I", "A", "S", "E", "C"] as const).map((c, i) => ({ ...scale(c, 20 + i * 4, [10, 50]), code: c, likeCount: 0 })),
      hollandCode: null,
      differentiation: null,
      elevation: null,
      lowDifferentiation: false,
    },
    personality: { facets: [scale("E3", 4, [1, 5]), scale("N1", 2, [1, 5]), scale("O5", 3.5, [1, 5])], domains: [scale("Extraversion", 3.4, [1, 5])], honestyHumility: null },
    values: null,
    reasoning: null,
    behaviour: null,
    completeness: { partial: true, missing: [] },
  };
}

describe("published norms", () => {
  it("transcribes the O*NET Short-IP norms on our 10–50 sum metric, with source, table and page", () => {
    // Rounds et al. (2016) Table 8, Short-IP total: R item mean 2.79, SD 0.85; Table 9 alpha .88.
    expect(PSYCHOMETRICS["onet.R"]).toMatchObject({ mean: 27.9, sd: 8.5, reliability: 0.88 });
    expect(PSYCHOMETRICS["onet.E"]).toMatchObject({ mean: 27.6, sd: 8.2, reliability: 0.85 });
    for (const k of ["R", "I", "A", "S", "E", "C"]) {
      const p = PSYCHOMETRICS[`onet.${k}`]!;
      expect(p.source).toMatch(/Table 8 \(p\. 36\).*Table 9 \(p\. 37\)/);
      // Means sit inside the 10–50 sum range, SDs are plausible for a 10-item 5-point scale.
      expect(p.mean).toBeGreaterThan(10);
      expect(p.mean).toBeLessThan(50);
      expect(p.sd).toBeGreaterThan(5);
      expect(p.sd).toBeLessThan(12);
    }
  });

  it("keeps every entry without a citable source null, and every filled entry cited", () => {
    for (const k of REQUIRED_KEYS) {
      const p = PSYCHOMETRICS[k];
      if (p) expect(p.source, k).toMatch(/Table/);
    }
    // Honesty-Humility (Mini-IPIP6) has no transcribed source.
    expect(PSYCHOMETRICS["hh.HH"]).toBeNull();
    expect(REQUIRED_KEYS.filter((k) => !PSYCHOMETRICS[k])).toEqual(["hh.HH"]);
    expect(NORMS_STAMP).toMatch(/^\d+:[0-9a-z]+$/);
  });

  it("scores interests as normed with the published table, using the published reliability", () => {
    const items = [...itemIndex.values()].filter((i) => i.module === "03_interests_onet_ip_short_form" && !i.validity);
    const r = Object.fromEntries(items.map((i) => [i.id, 3]));
    const s = scoreInterests(items, r);
    const R = s.scales.find((x) => x.code === "R")!;
    expect(R.raw).toBe(30);
    expect(R.normed!.z).toBeCloseTo((30 - 27.9) / 8.5, 6);
    expect(R.normed!.reliability).toBe(0.88);
  });
});

describe("IPIP-NEO-120 norms (Kajonius & Johnson 2019, Table A1)", () => {
  it("are Table A1 on our item-mean metric: the facet-sum mean and SD ÷ 4, alpha as published", () => {
    // N1 Anxiety 12.07 / 3.77 / .79 (p. 274); C6 Cautiousness 13.68 / 4.09 / .88 (p. 275).
    expect(PSYCHOMETRICS["neo.N1"]).toMatchObject({ mean: 3.018, sd: 0.943, reliability: 0.79 });
    expect(PSYCHOMETRICS["neo.N1"]!.source).toMatch(/Table A1 \(p\. 274\)/);
    expect(PSYCHOMETRICS["neo.C6"]).toMatchObject({ mean: 3.42, sd: 1.023, reliability: 0.88 });
    expect(PSYCHOMETRICS["neo.C6"]!.source).toMatch(/Table A1 \(p\. 275\)/);
    // Domains: Neuroticism 11.10 / 2.66 / .90.
    expect(PSYCHOMETRICS["neo.Neuroticism"]).toMatchObject({ mean: 2.775, sd: 0.665, reliability: 0.9 });
  });

  it("derive Openness without O6 from the table, with the planning reliability", () => {
    const o = opennessWithoutO6();
    expect(o.m).toBeCloseTo((14.6 + 14.67 + 15.2 + 12.28 + 14.5) / 5, 10);
    expect(o.rbar).toBeGreaterThan(0.2);
    expect(o.rbar).toBeLessThan(0.3);
    // Back-check: with O6 and the same r̄, the six-facet SD is the table's 2.06.
    const s6 = [3.41, 3.58, 3.01, 3.26, 3.55, OPENNESS_WITH_O6.o6.sd];
    let v = s6.reduce((a, x) => a + x * x, 0);
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) v += 2 * o.rbar * s6[i]! * s6[j]!;
    expect(Math.sqrt(v) / 6).toBeCloseTo(OPENNESS_WITH_O6.sd, 10);
    expect(PSYCHOMETRICS["neo.Openness"]).toMatchObject({ mean: 3.563, sd: 0.525, reliability: 0.75 });
    expect(PSYCHOMETRICS["neo.Openness"]!.source).toMatch(/O1–O5 only/);
  });
});

describe("norms applied when a profile is read", () => {
  it("norms stored raw scores, and switches the Work Design inputs from anchored to normed", () => {
    const before = personInputs(stored());
    expect(before["interests.R"]!.provenance).toBe("anchored");
    const p = applyNorms(stored());
    expect(p.interests!.scales.every((s) => s.normed)).toBe(true);
    const after = personInputs(p);
    for (const k of ["R", "I", "A", "S", "E", "C"]) expect(after[`interests.${k}` as "interests.R"]!.provenance).toBe("normed");
    // R raw 20 is below the norm mean of 27.9: a percentile under 50, where the anchored value was 25.
    expect(after["interests.R"]!.value).toBeLessThan(50);
    expect(p.norms.status).toBe("provisional");
  });

  it("switches personality too, as soon as its norms are in the table", () => {
    const inputs = personInputs(applyNorms(stored()));
    for (const k of ["neo.E3", "neo.N1", "neo.O5", "neo.Extraversion"] as const) expect(inputs[k]!.provenance, k).toBe("normed");
    expect(normBasis(applyNorms(stored())).personality).toBe("population");
    // A scale missing from the table stays anchored, and then the instrument as a whole is not population-normed.
    const partial = { ...PSYCHOMETRICS, "neo.N1": null };
    const p = applyNorms(stored(), partial);
    expect(personInputs(p)["neo.N1"]!.provenance).toBe("anchored");
    expect(normBasis(p).personality).toBe("self");
  });

  it("removes a norm that is no longer in the table (never keeps a stale one)", () => {
    const p = applyNorms(applyNorms(stored()), {});
    expect(p.interests!.scales.every((s) => s.normed === null)).toBe(true);
    expect(p.norms.status).toBe("pending");
  });

  it("tells the report which ruler each instrument uses, and never mixes them under one name", () => {
    // Interests normed, personality not (one facet without a norm).
    const f = buildReportFacts(applyNorms(stored(), { ...PSYCHOMETRICS, "neo.N1": null }), [], { current: null, considering: [] });
    expect(f.basis).toBe("mixed");
    expect(f.interests!.areas[0]).toHaveProperty("vsPopulation");
    expect(f.interests!.areas[0]).not.toHaveProperty("vsOwnAverage");
    expect(f.personality!.domains[0]).not.toHaveProperty("vsPopulation");
    expect(f.basisExplained).toMatch(/Never compare/);
  });
});
