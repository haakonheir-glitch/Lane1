import { describe, expect, it } from "vitest";
import { normed } from "@/lib/scoring/core";
import type { ProfileScores } from "@/lib/scoring/profile";
import type { ScaleScore } from "@/lib/scoring/types";
import type { Family, Lane, Role, Taxonomy } from "@/lib/taxonomy/generated";
import { entryPoint, rankRoles, resolveConstruct, sortMatches } from "@/lib/matching";
import { roleFromData, type RoleData } from "@/lib/matching/roles";
import { ROLE_PROFILES_V2, matchV2 } from "@/lib/matching/v2";
import { toV1Matches } from "@/lib/matching/v2/adapter";
import { personInputs } from "@/lib/workdesign/person";
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

/* ---------- match rows (matching v2, through the adapter) ---------- */

// Career fit is matching v2 (tests/matching-v2.test.ts); matching v1 was removed on 2026-10-28.
describe("match rows", () => {
  const rows = toV1Matches(matchV2({ inputs: personInputs(sampleProfile) }, { draws: 60 }));

  it("sorts by band first, then by fit within a band", () => {
    const sorted = sortMatches(rows.map((match) => ({ match, name: match.laneId })));
    const order = ["strong", "testing", "unlikely", "insufficient"];
    const bands = sorted.map((x) => x.match.band);
    expect(bands).toEqual([...bands].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
    for (let i = 1; i < sorted.length; i++) {
      const [a, b] = [sorted[i - 1]!.match, sorted[i]!.match];
      if (a.band === b.band && a.vsAverage !== null && b.vsAverage !== null) expect(a.vsAverage).toBeGreaterThanOrEqual(b.vsAverage);
    }
  });

  it("covers all 205 real career paths for the sample profile, every band in use", () => {
    expect(rows).toHaveLength(LANES.length);
    expect(new Set(rows.map((x) => x.band))).toEqual(new Set(["strong", "testing", "unlikely"]));
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

/* ---------- starting roles from data (precision pass step 6) ---------- */

describe("starting roles from O*NET data", () => {
  const MODES = ["m1", "m2", "m3", "m4", "m5"];
  const modes = (xs: number[]) => Object.fromEntries(MODES.map((m, i) => [m, xs[i]!]));
  // OI profiles in R, I, A, S, E, C order (O*NET's 1–7 scale).
  const roles: RoleData["roles"] = {
    "mix.seller": { occupations: ["41-0000.00"], interests: [1.5, 2, 2, 3.5, 6.8, 4], modes: modes([80, 70, 30, 20, 10]) },
    "mix.fixer": { occupations: ["49-0000.00"], interests: [6.9, 3, 1.5, 1.8, 2, 3], modes: modes([20, 30, 70, 80, 60]) },
  };
  // The person: Enterprising highest, Realistic and Conventional lowest (percentiles), modes like the seller's.
  const data = (over: Partial<RoleData> = {}): RoleData => ({ interests: [10, 40, 50, 60, 90, 20], modes: [75, 65, 35, 25, 15], modeIds: MODES, roles, interestShare: 0.75, floor: 10, ...over });
  const l = lane("mix", "E", [], {
    roles: [role("mix", "seller", "entry", ["persuasion"]), role("mix", "fixer", "entry", ["physical"]), role("mix", "writer", "entry", ["writing"]), role("mix", "boss", "manager", ["leadership"])],
  });
  const p = profile({ interests: { E: 2, R: -1 } });

  it("ranks linked roles by their O*NET interest and value-mode fit, ahead of tag-ranked ones", () => {
    const { top } = rankRoles(l, p, tiny([]), {}, 3, data());
    expect(top.map((r) => [r.role.title, r.basis])).toEqual([["seller", "onet"], ["fixer", "onet"], ["writer", "tags"]]);
    expect(top[0]!.reason).toMatch(/mostly Enterprising, one of your two strongest interests/);
    expect(top[0]!.note).toBeNull();
    // Managers are never starting roles, from data or not.
    expect(top.map((r) => r.role.title)).not.toContain("boss");
  });

  it("notes a role whose top O*NET interest is one of the person's two lowest", () => {
    const { top } = rankRoles(l, p, tiny([]), {}, 3, data());
    const fixer = top.find((r) => r.role.title === "fixer")!;
    expect(fixer.note).toBe("Its main interest area, Realistic, is one of your two lowest interests.");
    expect(roleFromData("mix.fixer", data({ interests: [90, 40, 50, 60, 10, 20] }))!.note).toBeNull();
  });

  it("weights interests against value modes as configured, and needs a usable profile", () => {
    const onlyInterests = roleFromData("mix.seller", data({ interestShare: 1 }))!.score;
    const onlyModes = roleFromData("mix.seller", data({ interestShare: 0 }))!.score;
    expect(roleFromData("mix.seller", data())!.score).toBeCloseTo(0.75 * onlyInterests + 0.25 * onlyModes, 10);
    expect(roleFromData("mix.writer", data())).toBeNull();
    expect(roleFromData("mix.seller", data({ interests: null }))).toBeNull();
  });

  it("falls back to tags for every role without data (and for configs that don't rank from data)", () => {
    const { top } = rankRoles(l, p, tiny([]));
    expect(top.every((r) => r.basis === "tags" && r.note === null)).toBe(true);
  });

  it("has role profiles for real roles only, each with a full interest profile", () => {
    const ids = new Set(LANES.flatMap((x) => x.roles.map((r) => r.id)));
    const entries = Object.entries(ROLE_PROFILES_V2);
    expect(entries.length).toBeGreaterThan(800);
    for (const [id, r] of entries) {
      expect(ids.has(id as Role["id"]), id).toBe(true);
      expect(r.interests).toHaveLength(6);
      expect(r.occupations.length).toBeGreaterThan(0);
    }
  });
});

/* ---------- no income labels ---------- */

describe("income labels", () => {
  it("are absent from the taxonomy and the matching output", () => {
    expect(taxonomy).not.toHaveProperty("payoffs");
    expect(Object.keys(taxonomy.tags)).not.toContain("variable_pay");
    for (const l of LANES) expect(l).not.toHaveProperty("payoff");
    const m = toV1Matches(matchV2({ inputs: personInputs(sampleProfile) }, { draws: 20 }))[0]!;
    expect(m).not.toHaveProperty("fitPayoff");
    expect(m).not.toHaveProperty("expectedPayoff");
  });
});
