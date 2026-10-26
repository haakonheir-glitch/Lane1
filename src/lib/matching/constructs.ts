/**
 * Resolves the taxonomy's construct ids (tag_to_constructs, e.g. "neo.E3", "interests.E",
 * "neo.N6(-)") to a score on the person's profile. Pure.
 *
 * Only validated, user-visible scales resolve (PLAN D28–D31). Lane's experimental scales
 * (dispositions, values_ext, lane_interests, eq, creativity, biodata) and unbuilt ones
 * (cognitive.verbal) are reported as unresolved; enabling one later is one entry in RESOLVERS.
 */
import type { ProfileScores } from "../scoring/profile";
import type { Normed } from "../scoring/core";
import type { ScaleScore } from "../scoring/types";

export type Resolved = {
  id: string;
  /** Standard score (z) with sign applied for "(-)" constructs. */
  z: number;
  /** Reliability of the underlying scale, or null when unknown (ipsative values). */
  reliability: number | null;
  /** Plain-language name for reasons, e.g. "assertiveness" or "Enterprising interests". */
  label: string;
  /**
   * "normed" = against a population; "self" = relative to the person's other scales on the same
   * instrument (no norms needed, scoring/self.ts); "ipsative" = the person's forced-sort values.
   */
  basis: "normed" | "self" | "ipsative";
};

export type Unresolved = { id: string; reason: "experimental" | "not_built" | "no_score" | "unknown" };

/** Families of constructs the assessment collects but keeps hidden until a pilot validates them. */
export const EXPERIMENTAL_PREFIXES = ["dispositions", "values_ext", "lane_interests", "eq", "creativity", "biodata"];

const fromNormed = (id: string, n: Normed | null | undefined, label: string): Resolved | null =>
  n ? { id, z: n.z, reliability: n.reliability, label, basis: "normed" } : null;

/** Population norms when they exist; otherwise the score relative to the person's own scales. */
const fromScale = (id: string, s: ScaleScore, label: string): Resolved | null =>
  s.normed ? fromNormed(id, s.normed, label) : s.self ? { id, z: s.self.z, reliability: s.self.reliability, label, basis: "self" } : null;

/** Mean z of several normed areas; reliability = mean reliability (conservative for a composite). */
function composite(id: string, ns: (Normed | null | undefined)[], label: string): Resolved | null {
  const ok = ns.filter((n): n is Normed => !!n);
  if (!ok.length) return null;
  const z = ok.reduce((a, n) => a + n.z, 0) / ok.length;
  const reliability = ok.reduce((a, n) => a + n.reliability, 0) / ok.length;
  return { id, z, reliability, label, basis: "normed" };
}

/** WIL values are a forced sort: standardise within the person (ipsative), PLAN D31. */
function value(id: string, p: ProfileScores, valueId: string): Resolved | null {
  const vs = p.values?.filter((v) => v.visibility === "user");
  if (!vs || vs.length < 3) return null;
  const v = vs.find((x) => x.id === valueId);
  if (!v) return null;
  const m = vs.reduce((a, x) => a + x.score, 0) / vs.length;
  const sd = Math.sqrt(vs.reduce((a, x) => a + (x.score - m) ** 2, 0) / vs.length);
  if (sd === 0) return null;
  return { id, z: (v.score - m) / sd, reliability: null, label: `${v.label} (work value)`, basis: "ipsative" };
}

/**
 * Reasoning areas on the same footing as the rest of the profile (PLAN D52). Lane fit compares
 * every construct with the person's own average, so all of them must be on one scale:
 * - while interests and personality are relative to the person (no population norms yet), the
 *   reasoning areas are made relative to the person too: each area's z against the mean and SD of
 *   the person's own areas, the way scoring/self.ts treats facets. The absolute level (general
 *   reasoning) carries no within-person information, so it doesn't resolve in this mode.
 * - once interests or personality are population-normed, the reasoning areas' provisional
 *   population scores are used as they are.
 * The profile always shows the population-based reasoning scores; this only changes matching.
 */
const MIN_AREAS = 3;
type AreaScore = { z: number; reliability: number; basis: "normed" | "self" };

function populationMode(p: ProfileScores): boolean {
  return !!(p.interests?.scales.some((s) => s.normed) || p.personality?.facets.some((s) => s.normed) || p.personality?.domains.some((s) => s.normed));
}

function reasoningAreas(p: ProfileScores): Map<string, AreaScore> {
  const scored = (p.reasoning?.areas ?? []).flatMap((a) => (a.normed ? [{ id: a.id, n: a.normed }] : []));
  if (populationMode(p)) return new Map(scored.map((a) => [a.id, { z: a.n.z, reliability: a.n.reliability, basis: "normed" as const }]));
  if (scored.length < MIN_AREAS) return new Map();
  const mean = scored.reduce((s, a) => s + a.n.z, 0) / scored.length;
  const sd = Math.sqrt(scored.reduce((s, a) => s + (a.n.z - mean) ** 2, 0) / scored.length);
  if (sd === 0) return new Map();
  return new Map(scored.map((a) => [a.id, { z: (a.n.z - mean) / sd, reliability: a.n.reliability, basis: "self" as const }]));
}

const fromArea = (id: string, p: ProfileScores, areaId: string, label: string): Resolved | null => {
  const a = reasoningAreas(p).get(areaId);
  return a ? { id, z: a.z, reliability: a.reliability, label, basis: a.basis } : null;
};

const area = (p: ProfileScores, a: string) => p.reasoning?.areas.find((x) => x.id === a)?.normed;

/** Lower-case facet label for prose ("Assertiveness" → "assertiveness"). */
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

type Resolver = (id: string, p: ProfileScores, key: string) => Resolved | null;
const RESOLVERS: Record<string, Resolver> = {
  neo: (id, p, key) => {
    const f = p.personality?.facets.find((x) => x.id === key);
    return f ? fromScale(id, f, lc(f.label)) : null;
  },
  interests: (id, p, key) => {
    const s = p.interests?.scales.find((x) => x.code === key);
    return s ? fromScale(id, s, `${s.label} interests`) : null;
  },
  values: (id, p, key) => value(id, p, { independence: "Independence", working_conditions: "Working Conditions", achievement: "Achievement", recognition: "Recognition", relationships: "Relationships", support: "Support" }[key] ?? ""),
  cognitive: (id, p, key) => {
    switch (key) {
      case "general":
        // An absolute level: only meaningful against a population (see reasoningAreas).
        return populationMode(p) ? composite(id, [area(p, "reasoning"), area(p, "spatial"), area(p, "quantitative"), area(p, "memory")], "general reasoning") : null;
      case "matrix":
      case "series":
      case "number_series": // results expose areas, not single tasks (PLAN D30)
        return fromArea(id, p, "reasoning", "reasoning with patterns and series");
      case "quant":
        return fromArea(id, p, "quantitative", "quantitative reasoning");
      case "rotation":
        return fromArea(id, p, "spatial", "spatial reasoning");
      case "symbol_match":
        return fromArea(id, p, "speed", "processing speed");
      default:
        return null;
    }
  },
  // Behaviour tasks have no norms yet, so they can't be placed on a z scale.
  behaviour: () => null,
};

/** Parse "neo.N6(-)" → { prefix: "neo", key: "N6", sign: -1 }. */
export function parseConstruct(id: string) {
  const m = /^([a-z_]+)\.([A-Za-z0-9_]+)(\((-|phase2)\))?$/.exec(id);
  if (!m) return null;
  return { prefix: m[1]!, key: m[2]!, sign: m[4] === "-" ? -1 : 1, phase2: m[4] === "phase2" };
}

export function resolveConstruct(id: string, p: ProfileScores): Resolved | Unresolved {
  const c = parseConstruct(id);
  if (!c) return { id, reason: "unknown" };
  if (c.phase2) return { id, reason: "not_built" };
  if (EXPERIMENTAL_PREFIXES.includes(c.prefix)) return { id, reason: "experimental" };
  const r = RESOLVERS[c.prefix];
  if (!r) return { id, reason: "unknown" };
  const v = r(id, p, c.key);
  if (!v) return { id, reason: "no_score" };
  return c.sign < 0 ? { ...v, z: -v.z, label: `low ${v.label}` } : v;
}

export const isResolved = (x: Resolved | Unresolved): x is Resolved => "z" in x;
