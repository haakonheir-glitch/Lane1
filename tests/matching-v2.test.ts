import { describe, expect, it } from "vitest";
import { LANE_PROFILES_V2, V2_CONFIG, bestByDirection, computeFit, facetShares, matchAllV2, matchV2, rankV2, topFive, type LaneProfileV2 } from "@/lib/matching/v2";
import { TEST_PROFILES, population, synthetic } from "@/lib/matching/v2/synthetic";
import { toV1Matches } from "@/lib/matching/v2/adapter";
import { matchingVersion } from "@/lib/matching/version";
import { LANES, getLane } from "@/lib/taxonomy";

const DRAWS = 120;

/** A small field of made-up career paths for exact checks. */
const base: LaneProfileV2 = {
  name: "Base",
  provenance: "onet",
  coverage: 1,
  interests: [2, 3, 2, 5, 4, 3],
  values: [5, 4, 4, 5, 4, 5],
  modes: { influence: 50, analyse: 50, build: 50, organise: 50, care: 50, teach: 50, create: 50, lead: 50, protect: 50 },
  environment: { autonomy: 50, social: 50, pace: 50, conflict: 50, competition: 50, precision: 50, variety: 50, challenge: 50 },
  abilities: [
    { area: "reasoning", demand: 60, importance: 4 },
    { area: "quantitative", demand: 40, importance: 3 },
    { area: "spatial", demand: 30, importance: 2 },
    { area: "memory", demand: 50, importance: 2 },
    { area: "speed", demand: 50, importance: 2 },
  ],
};
const lane = (over: Partial<LaneProfileV2>): LaneProfileV2 => ({ ...base, ...over });

describe("matching v2: data and config", () => {
  it("has an O*NET profile for every career path in the taxonomy", () => {
    expect(Object.keys(LANE_PROFILES_V2).sort()).toEqual(LANES.map((l) => l.id).sort());
    for (const p of Object.values(LANE_PROFILES_V2)) expect(p.interests).toHaveLength(6);
  });

  it("keeps every personality facet at or under 15% of every fit, shrinking it when needed", () => {
    // A profile built so that one facet would carry far more: everything flat except orderliness.
    const lopsided = synthetic({ interests: { I: 60, C: 55 }, facets: { C2: 100 } });
    for (const p of [lopsided, synthetic(TEST_PROFILES.analyst!.spec), ...population(4, 3)]) {
      for (const [f, share] of facetShares(p, LANE_PROFILES_V2)) expect(share, f).toBeLessThanOrEqual(V2_CONFIG.facetCap + 0.01);
    }
    const r = matchV2(lopsided, { draws: 40 });
    if (r.guard.length) expect(r.notes.map((n) => n.code)).toContain("facet_guard");
  });

  it("defaults to v1", () => {
    expect(matchingVersion()).toBe("v1");
  });
});

describe("matching v2: fit", () => {
  const person = synthetic(TEST_PROFILES.analyst!.spec);

  it("is deterministic for the same profile", () => {
    const a = matchV2(person, { draws: DRAWS });
    const b = matchV2(person, { draws: DRAWS });
    expect(a).toEqual(b);
  });

  it("returns ordered distributions, and computeFit agrees with matchAllV2", () => {
    const field = { a: lane({}), b: lane({ interests: [1, 6, 1, 2, 2, 5] }), c: lane({ interests: [6, 2, 1, 2, 3, 2] }) };
    const all = matchAllV2(person, field, { draws: DRAWS });
    const one = computeFit(person, "b", field, { draws: DRAWS });
    // A copy of the profile is matched by content, not added twice.
    expect(computeFit(person, structuredClone(field.b), field, { draws: DRAWS })).toEqual(one);
    const b = all.lanes.find((l) => l.laneId === "b")!;
    expect(one.fulfilmentFit).toEqual(b.fulfilmentFit);
    expect(b.fulfilmentFit.p10).toBeLessThanOrEqual(b.fulfilmentFit.p50);
    expect(b.fulfilmentFit.p50).toBeLessThanOrEqual(b.fulfilmentFit.p90);
    // The investigative/conventional career is the analyst's best of the three.
    expect(b.fulfilmentFit.mean).toBeGreaterThan(all.lanes.find((l) => l.laneId === "c")!.fulfilmentFit.mean);
  });

  it("counts only a shortfall against ability fit", () => {
    const strong = synthetic({ reasoning: 99 });
    const weak = synthetic({ reasoning: 20 });
    const field = { a: lane({}) };
    expect(matchAllV2(strong, field, { draws: DRAWS }).lanes[0]!.abilityFit!.mean).toBeGreaterThan(97);
    expect(matchAllV2(weak, field, { draws: DRAWS }).lanes[0]!.abilityFit!.mean).toBeLessThan(80);
  });

  it("applies the penalty shapes: autonomy is a deficit, pace an excess", () => {
    const p = synthetic({ domains: {}, values: { Independence: 100, Achievement: 0, Recognition: 0, Relationships: 0, Support: 0, "Working Conditions": 0 }, facets: { C2: 0 } });
    // Autonomy need is 100 here; pace sits at 50 (processing speed and neuroticism at their defaults).
    const low = lane({ environment: { ...base.environment, autonomy: 10, pace: 10 } });
    const high = lane({ environment: { ...base.environment, autonomy: 100, pace: 90 } });
    const r = matchAllV2(p, { low, high }, { draws: DRAWS });
    const fitOf = (id: string, dim: string) => r.lanes.find((l) => l.laneId === id)!.components.environment.find((e) => e.id === dim)!.fit;
    expect(fitOf("low", "autonomy")).toBeLessThan(0.3);
    expect(fitOf("high", "autonomy")).toBe(1);
    // Excess: a slower pace than you'd choose costs nothing; a faster one does.
    expect(fitOf("low", "pace")).toBe(1);
    expect(fitOf("high", "pace")).toBeCloseTo(0.6, 1);
  });

  it("treats a missing career component as neutral, not as a bonus", () => {
    const field = { withValues: lane({}), without: lane({ values: null }) };
    const r = matchAllV2(person, field, { draws: DRAWS });
    const w = r.lanes.find((l) => l.laneId === "without")!;
    expect(w.components.imputed).toEqual(["values"]);
    expect(w.fulfilmentFit.mean).toBeCloseTo(r.lanes.find((l) => l.laneId === "withValues")!.fulfilmentFit.mean, 0);
  });

  it("gives drivers and frictions with the person's source scores", () => {
    const r = matchV2(person, { draws: DRAWS });
    const top = rankV2(r.lanes)[0]!;
    expect(top.drivers.length).toBeGreaterThan(0);
    for (const d of [...top.drivers, ...top.frictions]) expect(d.sources.length).toBeGreaterThan(0);
    expect(top.drivers.every((d) => d.contribution > 0)).toBe(true);
    // A friction never reads as a plain strength.
    for (const l of r.lanes) for (const f of l.frictions) expect(f.label).not.toMatch(/^(\w+ interests|Work value: \w+)$/);
  });
});

describe("matching v2: the six test profiles", () => {
  for (const [id, t] of Object.entries(TEST_PROFILES)) {
    it(`${t.label}: face-valid`, () => {
      const r = matchV2(synthetic(t.spec), { draws: DRAWS });
      if (id === "flat") {
        expect(r.bandCounts.strong).toBeLessThanOrEqual(3);
        expect(r.notes.map((n) => n.code)).toContain("flat_profile");
        expect(r.bandCounts.unlikely).toBeLessThan(20);
        return;
      }
      const top10 = rankV2(r.lanes).slice(0, 10);
      const hits = top10.filter((l) => t.expectFamilies.includes(getLane(l.laneId)!.family)).length;
      expect(hits).toBeGreaterThanOrEqual(6);
      expect(r.bandCounts.strong).toBeGreaterThanOrEqual(8);
      expect(r.bandCounts.strong).toBeLessThanOrEqual(22);
    });
  }

  it("blends archetypes: shares sum to 100, the leading archetype matches the profile", () => {
    const r = matchV2(synthetic(TEST_PROFILES.maker!.spec), { draws: DRAWS });
    const total = r.archetype!.blend.reduce((a, b) => a + b.share, 0);
    expect(total).toBeGreaterThan(99.5);
    expect(total).toBeLessThan(100.5);
    expect(r.archetype!.top2[0]!.archetype).toBe("Maker");
  });

  it("marks the blend tentative from the draws, and notes a shared-input pair separately", () => {
    const carer = matchV2(synthetic(TEST_PROFILES.carer!.spec), { draws: DRAWS }).archetype!;
    expect(carer.top2.map((x) => x.archetype)).toEqual(["Healer", "Teacher"]);
    expect(carer.tentative).toBe(false);
    expect(carer.caveat).toMatch(/same scores/);
    const hunter = matchV2(synthetic(TEST_PROFILES.hunter!.spec), { draws: DRAWS }).archetype!;
    expect(hunter.tentative).toBe(true);
    expect(hunter.reason).toMatch(/of draws/);
  });

  it("explains few strong fits even when the profile isn't flat", () => {
    const r = matchV2(synthetic({ interests: { I: 62, A: 58, S: 45, E: 44, R: 48, C: 46 } }), { draws: DRAWS });
    if (r.bandCounts.strong < V2_CONFIG.flat.minStrong) expect(r.notes.some((n) => n.code === "flat_profile" || n.code === "few_strong")).toBe(true);
  });
});

describe("matching v2: presentation and adapter", () => {
  const r = matchV2(synthetic(TEST_PROFILES.storyteller!.spec), { draws: DRAWS });

  it("lists the top five strong fits first, with ability fit", () => {
    const t = topFive(r);
    expect(t).toHaveLength(5);
    expect(t.every((x) => x.band === "strong")).toBe(true);
    expect(t.every((x) => x.ability !== null)).toBe(true);
  });

  it("gives one best career path per direction", () => {
    const b = bestByDirection(r);
    expect(new Set(b.map((x) => x.direction)).size).toBe(b.length);
    expect(b.length).toBeGreaterThanOrEqual(6);
  });

  it("adapts to the v1 shape with the same bands", () => {
    const m = toV1Matches(r);
    expect(m).toHaveLength(r.lanes.length);
    expect(m.filter((x) => x.band === "strong")).toHaveLength(r.bandCounts.strong);
    expect(m.filter((x) => x.band === "testing")).toHaveLength(r.bandCounts.possible);
  });
});

describe("matching v2: small population", () => {
  it("no career path is a strong fit for more than 30% of people", () => {
    const people = population(60, 7);
    const strong = new Map<string, number>();
    for (const p of people) for (const l of matchV2(p, { draws: 80 }).lanes) if (l.band === "strong") strong.set(l.laneId, (strong.get(l.laneId) ?? 0) + 1);
    expect(Math.max(...strong.values()) / people.length).toBeLessThanOrEqual(0.3);
  });
});
