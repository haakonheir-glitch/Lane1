import { describe, expect, it } from "vitest";
import { sampleProfile } from "@/lib/mock/profile";
import { addSelfScores } from "@/lib/scoring/self";
import type { ProfileScores } from "@/lib/scoring/profile";
import { DIMENSIONS, ENVIRONMENT, VALUE_MODES, onetElements } from "@/lib/workdesign/model";
import { overlappingModes, personInputs, personWorkDesign, relativeOfDimensions, scoreDimension, type DimensionScore } from "@/lib/workdesign/person";
import { shadowRecord } from "@/lib/workdesign/shadow";
import { EXPERIMENTAL_PREFIXES } from "@/lib/matching";

const profile = addSelfScores(sampleProfile);
// As real users have it now: no population norms for interests and personality.
const strip = <T extends { normed: unknown }>(x: T) => ({ ...x, normed: null });
const unnormed: ProfileScores = addSelfScores({
  ...sampleProfile,
  interests: sampleProfile.interests && { ...sampleProfile.interests, scales: sampleProfile.interests.scales.map(strip) },
  personality: sampleProfile.personality && { ...sampleProfile.personality, facets: sampleProfile.personality.facets.map(strip), domains: sampleProfile.personality.domains.map(strip) },
});

describe("work design model", () => {
  it("defines nine value modes with archetypes and nine environment dimensions with a penalty shape", () => {
    expect(VALUE_MODES.map((d) => d.archetype)).toEqual(["Hunter", "Scout", "Maker", "Gatherer", "Healer", "Teacher", "Storyteller", "Chief", "Guardian"]);
    expect(ENVIRONMENT).toHaveLength(9);
    for (const d of ENVIRONMENT) expect(["deficit", "excess", "two_sided"]).toContain(d.penalty);
    expect(new Set(DIMENSIONS.map((d) => d.id)).size).toBe(DIMENSIONS.length);
  });
  it("never uses an experimental research scale on the person side", () => {
    for (const d of DIMENSIONS) for (const x of d.person) expect(EXPERIMENTAL_PREFIXES.some((p) => x.id.startsWith(`${p}.`))).toBe(false);
  });
  it("lists every O*NET element it reads, for verification against the download", () => {
    const els = onetElements();
    expect(els.some((e) => e.element === "Freedom to Make Decisions" && e.file === "Work Context")).toBe(true);
    expect(els.filter((e) => e.file === "Abilities").map((e) => e.element)).toEqual(expect.arrayContaining(["Deductive Reasoning", "Perceptual Speed", "Memorization"]));
  });
});

describe("person side", () => {
  it("puts every input on 0–100 with a standard error and a provenance", () => {
    const inputs = personInputs(unnormed);
    expect(Object.keys(inputs).length).toBeGreaterThan(30);
    for (const e of Object.values(inputs)) {
      expect(e!.value).toBeGreaterThanOrEqual(0);
      expect(e!.value).toBeLessThanOrEqual(100);
      expect(e!.se).toBeGreaterThan(0);
      expect(["normed", "anchored", "ipsative", "task"]).toContain(e!.provenance);
    }
    // Anchored: the scale midpoint is 50.
    const interestsC = unnormed.interests!.scales.find((s) => s.code === "C")!;
    expect(inputs["interests.C"]!.value).toBeCloseTo(((interestsC.raw! - 10) / 40) * 100);
    expect(inputs["interests.C"]!.provenance).toBe("anchored");
    // Where provisional norms exist (reasoning), the percentile is used.
    expect(inputs["reasoning.general"]!.provenance).toBe("normed");
  });

  it("scores dimensions as weighted means with propagated error, and drops thin coverage", () => {
    const d = VALUE_MODES.find((m) => m.id === "build")!;
    const s = scoreDimension(d, { "interests.R": { value: 80, se: 10, provenance: "anchored", source: "x" }, "reasoning.spatial": { value: 40, se: 10, provenance: "normed", source: "y" } });
    expect(s.value).toBeCloseTo(0.6 * 80 + 0.4 * 40);
    expect(s.se).toBeCloseTo(Math.sqrt(0.36 * 100 + 0.16 * 100));
    expect(s.provenance).toBe("provisional");
    const thin = scoreDimension(d, { "reasoning.spatial": { value: 40, se: 10, provenance: "normed", source: "y" } });
    expect(thin.value).toBeNull(); // 40% of the weight is under the 50% floor
  });

  it("calls a mode a strength only when its gap beats the error of the gap", () => {
    const mk = (id: string, value: number, se = 5): DimensionScore => ({ id, name: id, value, se, coverage: 1, provenance: "provisional", inputs: [] });
    const flat = relativeOfDimensions(["a", "b", "c", "d"].map((id, i) => mk(id, 50 + i)));
    expect(Object.values(flat).every((r) => r === "none")).toBe(true);
    const peaked = relativeOfDimensions([mk("a", 90), mk("b", 50), mk("c", 48), mk("d", 52)]);
    expect(peaked.a).toBe("strength");
    expect(peaked.d).toBe("none"); // 8 below the mean, inside the error of the gap
  });

  it("reports mode pairs that share inputs, so they aren't forced apart", () => {
    const pairs = overlappingModes().map((p) => p.join("+"));
    expect(pairs).toContain("care+teach");
    expect(pairs).toContain("influence+lead");
  });

  it("gives the Enterprising-led sample a higher Influence than Build", () => {
    const wd = personWorkDesign(unnormed);
    const by = Object.fromEntries(wd.valueModes.map((m) => [m.id, m.value]));
    expect(by.influence!).toBeGreaterThan(by.build!);
    expect(wd.environment.find((e) => e.id === "challenge")!.value).not.toBeNull();
  });

  it("is deterministic", () => {
    expect(JSON.stringify(personWorkDesign(profile))).toBe(JSON.stringify(personWorkDesign(structuredClone(profile))));
  });

  it("leaves dimensions without measurements empty instead of guessing", () => {
    const empty: ProfileScores = { ...profile, interests: null, personality: null, values: null, reasoning: null, behaviour: null };
    const wd = personWorkDesign(empty);
    expect([...wd.valueModes, ...wd.environment].every((d) => d.value === null)).toBe(true);
  });
});

describe("shadow mode", () => {
  it("joins hidden research scores with the dimensions, without changing either", () => {
    const wd = personWorkDesign(profile);
    const rec = shadowRecord([{ session: "S2", validity: { flags: [], confidence: "ok" } as never, hidden: { dispositions: { x: 1 } } }], wd);
    expect(rec.research.S2).toEqual({ dispositions: { x: 1 } });
    expect(Object.keys(rec.dimensions)).toHaveLength(18);
  });
});
