import { describe, expect, it } from "vitest";
import { normed } from "@/lib/scoring/core";
import type { ProfileScores } from "@/lib/scoring/profile";
import type { ScaleScore } from "@/lib/scoring/types";
import type { Family, Lane, Role, Taxonomy } from "@/lib/taxonomy/generated";
import { entryPoint, matchLanes, payoffCurve, rankRoles, resolveConstruct, sortMatches } from "@/lib/matching";
import { LANES, taxonomy } from "@/lib/taxonomy";
import { sampleProfile } from "@/lib/mock/profile";

/* ---------- fixtures ---------- */

const RIASEC = ["R", "I", "A", "S", "E", "C"] as const;
const scale = (id: string, label: string, z: number, r: number): ScaleScore => ({
  id,
  label,
  raw: 50 + 10 * z,
  rawRange: [0, 100],
  answered: 1,
  items: 1,
  normed: normed(50 + 10 * z, { mean: 50, sd: 10, reliability: r }),
  visibility: "user",
});

/** A profile with the given interest and facet z-scores; everything else at 0. */
function profile({ interests = {}, facets = {}, r = 0.85, values }: { interests?: Partial<Record<(typeof RIASEC)[number], number>>; facets?: Record<string, number>; r?: number; values?: Record<string, number> } = {}): ProfileScores {
  return {
    scoringVersion: "test",
    norms: { status: "provisional", note: "" },
    sessions: [],
    personality: { facets: Object.entries(facets).map(([id, z]) => scale(id, `facet ${id}`, z, r)), domains: [], honestyHumility: null },
    interests: {
      scales: RIASEC.map((c) => ({ ...scale(c, c, interests[c] ?? 0, r), code: c, likeCount: 0 })),
      hollandCode: null,
      differentiation: null,
      elevation: null,
      lowDifferentiation: false,
    },
    values: values ? Object.entries(values).map(([id, score], i) => ({ id, label: id, score, rank: i + 1, visibility: "user" as const })) : null,
    reasoning: null,
    behaviour: null,
    completeness: { partial: true, missing: [] },
  };
}

const role = (laneId: string, slug: string, level: Role["level"], tags: Role["tags"] = [], mode: Role["mode"] = "employed"): Role => ({
  id: `${laneId}.${slug}`,
  title: slug,
  level,
  track: level === "manager" || level === "director" || level === "exec" ? "mgmt" : level === "owner" ? "owner" : "ic",
  mode,
  aka: [],
  tags,
});

function lane(id: string, riasec: string, tags: Lane["tags"], extra: Partial<Lane> = {}): Lane {
  return {
    id: id as Lane["id"],
    name: id,
    family: "sales",
    description: "",
    isco: [],
    riasec,
    payoff: "linear",
    entry: "open",
    sprint: "direct",
    modes: ["employed"],
    ladder: "corporate",
    tags,
    status: "curated",
    isco_labels: {},
    roles: [role(id, "junior", "entry", tags), role(id, "manager", "manager", tags), role(id, "head", "director", tags)],
    ...extra,
  };
}

/** A small taxonomy using the real tag_to_constructs and levels. */
function tiny(lanes: Lane[]): Pick<Taxonomy, "families" | "tag_to_constructs" | "levels"> {
  const fam: Family = { id: "sales", name: "Test", description: "", lanes };
  return { families: [fam], tag_to_constructs: taxonomy.tag_to_constructs, levels: taxonomy.levels };
}

const deepFreeze = <T>(o: T): T => {
  if (o && typeof o === "object") {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
};

/* ---------- constructs ---------- */

describe("resolveConstruct", () => {
  const p = profile({ interests: { E: 1.5 }, facets: { N6: 1 }, values: { Independence: 30, Achievement: 20, Support: 10, Recognition: 20, Relationships: 20, "Working Conditions": 20 } });

  it("reads facets and interests, and reverses (-) constructs", () => {
    expect(resolveConstruct("interests.E", p)).toMatchObject({ z: 1.5, basis: "normed" });
    expect(resolveConstruct("neo.N6", p)).toMatchObject({ z: 1 });
    expect(resolveConstruct("neo.N6(-)", p)).toMatchObject({ z: -1, label: "low facet N6" });
  });

  it("standardises work values within the person (ipsative), with no reliability", () => {
    const r = resolveConstruct("values.independence", p);
    expect(r).toMatchObject({ basis: "ipsative", reliability: null });
    expect((r as { z: number }).z).toBeGreaterThan(1.5);
  });

  it("skips experimental, unbuilt and missing scales with a reason", () => {
    expect(resolveConstruct("dispositions.setback_resilience", p)).toEqual({ id: "dispositions.setback_resilience", reason: "experimental" });
    expect(resolveConstruct("cognitive.verbal(phase2)", p)).toMatchObject({ reason: "not_built" });
    expect(resolveConstruct("cognitive.quant", p)).toMatchObject({ reason: "no_score" });
    expect(resolveConstruct("behaviour.balloon", p)).toMatchObject({ reason: "no_score" });
  });
});

describe("reasoning in matching (PLAN D52)", () => {
  const areas = (zs: Record<string, number>): NonNullable<ProfileScores["reasoning"]> => ({
    generalAbility: null,
    norms: { source: "test", provisional: true },
    areas: Object.entries(zs).map(([id, z]) => ({ id: id as never, label: id, summary: "", normed: normed(50 + 10 * z, { mean: 50, sd: 10, reliability: 0.8 }) })),
  });
  const zs = { reasoning: 1.5, spatial: 0.5, quantitative: 1.0, memory: 1.0, speed: 1.0 };
  /** Interests and personality relative to the person (no population norms), as for real users today. */
  const selfOnly = (p: ProfileScores): ProfileScores => ({
    ...p,
    interests: p.interests && { ...p.interests, scales: p.interests.scales.map((x) => ({ ...x, normed: null, self: { z: 0, ci: [-1, 1], reliability: 0.75, assumedReliability: true } })) },
    personality: p.personality && { ...p.personality, facets: p.personality.facets.map((x) => ({ ...x, normed: null, self: { z: 0, ci: [-1, 1], reliability: 0.7, assumedReliability: true } })) },
  });

  it("makes reasoning areas relative to the person's own areas when the rest of the profile is", () => {
    const p = selfOnly({ ...profile(), reasoning: areas(zs) });
    const r = resolveConstruct("cognitive.matrix", p) as { z: number; basis: string };
    const s = resolveConstruct("cognitive.rotation", p) as { z: number; basis: string };
    expect(r.basis).toBe("self");
    // mean of the five areas is 1.0, SD √0.1: reasoning +0.5 → +1.58, spatial −0.5 → −1.58
    expect(r.z).toBeCloseTo(0.5 / Math.sqrt(0.1), 9);
    expect(s.z).toBeCloseTo(-0.5 / Math.sqrt(0.1), 9);
    // Being above the population everywhere gives no boost on its own: the level is not used.
    expect(resolveConstruct("cognitive.general", p)).toMatchObject({ reason: "no_score" });
  });

  it("needs at least three scored areas for a within-person comparison", () => {
    const p = selfOnly({ ...profile(), reasoning: areas({ reasoning: 1, spatial: 0 }) });
    expect(resolveConstruct("cognitive.matrix", p)).toMatchObject({ reason: "no_score" });
  });

  it("uses the population scores once interests or personality are population-normed", () => {
    const p = { ...profile(), reasoning: areas(zs) };
    expect(resolveConstruct("cognitive.matrix", p)).toMatchObject({ basis: "normed", z: 1.5 });
    expect(resolveConstruct("cognitive.general", p)).toMatchObject({ basis: "normed" });
  });
});

/* ---------- lane fit ---------- */

describe("matchLanes", () => {
  const tax = tiny([
    lane("es_lane", "ES", ["persuasion"]),
    lane("ec_lane", "EC", ["routine"]),
    lane("ia_lane", "IA", ["analytical"]),
    lane("rc_lane", "RC", ["physical"]),
    lane("ri_lane", "RI", ["building"]),
  ]);
  const enterprising = profile({ interests: { E: 2, S: 1, R: -1.5, C: -0.5 }, facets: { E3: 1 }, r: 0.95 });

  it("matches the person's interest code to the lane's", () => {
    const m = Object.fromEntries(matchLanes(enterprising, tax).map((x) => [x.laneId, x]));
    expect(m.es_lane!.fit!).toBeGreaterThan(m.ia_lane!.fit!);
    expect(m.es_lane!.band).toBe("strong");
    expect(m.rc_lane!.band).toBe("unlikely");
    expect(m.es_lane!.drivers[0]!.label).toBe("E interests");
  });

  it("is relative to the person: shifting every scale by the same amount changes nothing", () => {
    const shifted = profile({ interests: { E: 3, S: 2, R: -0.5, C: 0.5, I: 1, A: 1 }, facets: { E3: 2 }, r: 0.95 });
    const a = matchLanes(enterprising, tax).map((x) => x.fit);
    const b = matchLanes(shifted, tax).map((x) => x.fit);
    a.forEach((v, i) => expect(b[i]).toBeCloseTo(v!, 6));
  });

  it("(-) constructs push in the opposite direction", () => {
    const t = tiny([lane("calm", "E", ["pressure"]), lane("other", "E", [])]);
    const anxious = matchLanes(profile({ facets: { N1: 1.5, N6: 1.5 } }), t).find((x) => (x.laneId as string) === "calm")!;
    const steady = matchLanes(profile({ facets: { N1: -1.5, N6: -1.5 } }), t).find((x) => (x.laneId as string) === "calm")!;
    expect(steady.fit!).toBeGreaterThan(anxious.fit!);
  });

  it("lists tags it can't score yet instead of guessing (only experimental constructs behind them)", () => {
    const m = matchLanes(enterprising, tiny([lane("x", "E", ["competition", "persuasion"])]))[0]!;
    expect(m.unscoredTags).toEqual(["competition"]);
  });

  it("calls everything 'worth testing' when measurement can't separate lanes", () => {
    const noisy = profile({ interests: { E: 2, S: 1, R: -1.5, C: -0.5 }, facets: { E3: 1 }, r: 0 });
    expect(new Set(matchLanes(noisy, tax).map((x) => x.band))).toEqual(new Set(["testing"]));
  });

  it("says 'not enough data' without interest scores", () => {
    const p = { ...profile(), interests: null };
    expect(matchLanes(p, tax).every((x) => x.band === "insufficient" && x.fit === null)).toBe(true);
  });

  it("is pure and deterministic", () => {
    const p = deepFreeze(structuredClone(enterprising));
    const t = deepFreeze(structuredClone(tax));
    expect(matchLanes(p, t)).toEqual(matchLanes(p, t));
  });

  it("sorts by band first; the payoff toggle only reorders within a band", () => {
    const named = matchLanes(enterprising, tax).map((match) => ({ match, name: match.laneId }));
    for (const sort of ["fit", "fit-payoff"] as const) {
      const bands = sortMatches(named, sort).map((x) => x.match.band);
      expect(bands).toEqual([...bands].sort((a, b) => ["strong", "testing", "unlikely", "insufficient"].indexOf(a) - ["strong", "testing", "unlikely", "insufficient"].indexOf(b)));
    }
  });

  it("covers all 205 real lanes for the sample profile, every band in use", () => {
    const m = matchLanes(sampleProfile, taxonomy);
    expect(m).toHaveLength(LANES.length);
    expect(new Set(m.map((x) => x.band))).toEqual(new Set(["strong", "testing", "unlikely"]));
  });
});

/* ---------- roles ---------- */

describe("entry point and starting roles", () => {
  const p = profile({ interests: { E: 2 }, facets: { E3: 1 } });

  it("never recommends manager, director or exec roles, in any real lane, at any experience", () => {
    for (const l of LANES)
      for (const years of [undefined, "0", "lt2", "2to5", "5plus"] as const) {
        const exp = years ? { laneId: l.id, years, roleId: l.roles.find((r) => r.track === "mgmt")?.id } : {};
        for (const r of rankRoles(l, sampleProfile, taxonomy, exp).top) expect(r.role.track, `${l.id} ${r.role.title}`).not.toBe("mgmt");
      }
  });

  it("starts people without experience at trainee/entry", () => {
    const l = LANES.find((x) => x.id === "b2b_sales")!;
    expect(entryPoint(l, taxonomy)).toEqual({ level: "entry", current: null, note: "standard" });
    expect(rankRoles(l, p, taxonomy).top.every((r) => ["trainee", "entry"].includes(r.role.level))).toBe(true);
  });

  it("uses reported experience in the person's own lane, but keeps 'you are here' separate", () => {
    const l = LANES.find((x) => x.id === "b2b_sales")!;
    const manager = l.roles.find((r) => r.level === "manager")!;
    const ep = entryPoint(l, taxonomy, { laneId: l.id, roleId: manager.id, years: "5plus" });
    expect(ep).toEqual({ level: "senior", current: "manager", note: "from_experience" });
  });

  it("handles lanes without junior roles", () => {
    expect(entryPoint(LANES.find((x) => x.id === "quant_finance")!, taxonomy).note).toBe("via_other_lane");
    const advisory = LANES.find((x) => x.id === "independent_advisory")!;
    expect(entryPoint(advisory, taxonomy).note).toBe("needs_experience");
    expect(rankRoles(advisory, p, taxonomy).top).toEqual([]);
  });

  it("offers owner roles as a start only on the founder ladder", () => {
    const t = tiny([]);
    const withOwner = (ladder: Lane["ladder"]) =>
      lane("l", "E", ["persuasion"], { ladder, roles: [role("l", "junior", "entry", ["persuasion"]), role("l", "own", "owner", ["persuasion"], "owner")] });
    expect(rankRoles(withOwner("founder"), p, t).top.map((r) => r.role.level)).toContain("owner");
    expect(rankRoles(withOwner("creator"), p, t).top.map((r) => r.role.level)).not.toContain("owner");
  });

  it("ranks roles by their tags and explains with the person's strongest construct", () => {
    const l = lane("mix", "E", [], {
      roles: [role("mix", "seller", "entry", ["persuasion"]), role("mix", "builder", "entry", ["physical"]), role("mix", "boss", "manager", ["leadership"])],
    });
    const { top } = rankRoles(l, profile({ interests: { E: 2, R: -1 }, facets: { E3: 1.5 } }), tiny([]));
    expect(top.map((r) => r.role.title)).toEqual(["seller", "builder"]);
    expect(top[0]!.reason).toMatch(/^Persuading people draws on your .+, one of your stronger scores\.$/);
  });
});

/* ---------- payoff ---------- */

describe("payoff curves", () => {
  it("are increasing, and winner-take-all leaves the median with almost nothing", () => {
    for (const c of Object.keys(taxonomy.payoffs) as (keyof typeof taxonomy.payoffs)[]) {
      for (let x = 0; x < 1; x += 0.1) expect(payoffCurve(c, x + 0.1)).toBeGreaterThanOrEqual(payoffCurve(c, x));
    }
    expect(payoffCurve("winner_take_all", 0.5)).toBeLessThan(0.05);
    expect(payoffCurve("linear_high_floor", 0)).toBeGreaterThan(payoffCurve("linear", 0));
  });
});
