/**
 * Career map data: the taxonomy, matched against the profile through matching v2 (src/lib/matching/v2).
 * The profile is the sample until norms exist (PLAN D1/D2); the person's own experience and
 * considered lanes are real (onboarding). Server only: returns small client-safe shapes.
 */
import "server-only";
import { cache } from "react";
import { FAMILIES, LANES, LEVELS, getFamily, getLane, ladderOf, laneModes, taxonomy } from "../taxonomy";
import type { Lane, LaneId, LevelId, Role } from "../taxonomy/generated";
import { rankRoles, type Experience, type LaneMatch } from "../matching";
import type { RoleData } from "../matching/roles";
import type { ProfileScores } from "../scoring/profile";
import { LANE_PROFILES_V2, LANE_PROFILES_V2_STAMP, ROLE_PROFILES_V2, V2_CONFIG, applyGates, directionsOf, matchV2, penaltyOf, profileSeed, type Distribution, type LaneMatchV2, type MatchResultV2 } from "../matching/v2";
import { toV1Matches } from "../matching/v2/adapter";
import { personInputs, personWorkDesign } from "../workdesign/person";
import { applyNorms } from "../scoring/norms";
import { ENVIRONMENT, VALUE_MODES } from "../workdesign/model";
import { workBest, type WorkBest } from "../workdesign/best";
import { CAREER_DAYS_STAMP, typicalDay } from "../workdesign/day";
import { TAG_NOUN } from "../matching/roles";
import type { CareerCategory, CareerDirection, CareerPick, CareerPicks, DimRow, FitDriver, FitRange, LadderRow, LaneDetail, LaneFilterVocab, LaneRowData, RoleRef } from "../lanes/types";
import type { ExperienceAnswers } from ".";
import type { ReportCareerPath } from "../report/facts";

const roleRef = (r: Role): RoleRef => ({ id: r.id, title: r.title, level: r.level, mode: r.mode, aka: r.aka });

/**
 * The profile as matching reads it. The person's own profile and report stay relative to themselves
 * (owner's decision, 2026-10-30): published norms are applied here, for matching only, when the
 * running config reads them. Pure; cached per profile.
 */
export const matchingProfile = cache((profile: ProfileScores): ProfileScores => (V2_CONFIG.inputs.norms ? applyNorms(profile) : profile));

/** Which matching produced cached results: part of the cache key, so retuning v2 or rebuilding its data recomputes. */
export const matchingCacheKey = () => `v2:${V2_CONFIG.version}:${LANE_PROFILES_V2_STAMP}:${CAREER_DAYS_STAMP}`;

type V2Memo = { result: MatchResultV2; byLane: Map<string, LaneMatchV2>; adapted: LaneMatch[] };

/**
 * v2 matches by profile (500 draws × 205 fits, about half a second), kept across requests so that
 * opening a career path's detail doesn't rerun the Monte Carlo. Holds the native result (the Career
 * map's 2×2, the detail and the report read it) and the rows the lists and picks read, at most
 * 64 profiles.
 */
const v2Memo = new Map<string, V2Memo>();
function matchV2Memo(profile: ProfileScores): V2Memo {
  const person = { inputs: personInputs(matchingProfile(profile), V2_CONFIG.inputs) };
  const key = `${V2_CONFIG.version}:${profileSeed(person)}`;
  let r = v2Memo.get(key);
  if (!r) {
    const result = matchV2(person);
    r = { result, byLane: new Map(result.lanes.map((l) => [l.laneId, l])), adapted: toV1Matches(result) };
    if (v2Memo.size >= 64) v2Memo.delete(v2Memo.keys().next().value!);
    v2Memo.set(key, r);
  }
  return r;
}

/** Matching v2's native result for the profile, once per request. */
export const nativeFor = cache((profile: ProfileScores): V2Memo => matchV2Memo(profile));

/**
 * What starting-role ranking from data needs (matching/roles.ts): the person's interests and value
 * modes as matching sees them. Undefined (rank by tags) when the config doesn't rank from data.
 */
const roleDataFor = cache((profile: ProfileScores): RoleData | undefined => {
  if (!V2_CONFIG.rolesFromData) return undefined;
  const inputs = personInputs(matchingProfile(profile), V2_CONFIG.inputs);
  const codes = ["R", "I", "A", "S", "E", "C"] as const;
  const interests = codes.every((c) => inputs[`interests.${c}`]) ? codes.map((c) => inputs[`interests.${c}`]!.value) : null;
  const wd = personWorkDesign(matchingProfile(profile), undefined, V2_CONFIG.inputs);
  const w = V2_CONFIG.weights;
  return {
    interests,
    modes: VALUE_MODES.map((m) => wd.valueModes.find((x) => x.id === m.id)?.value ?? null),
    modeIds: VALUE_MODES.map((m) => m.id),
    roles: ROLE_PROFILES_V2,
    interestShare: w.interests / (w.interests + w.valueModes),
    floor: V2_CONFIG.correlationFloor,
  };
});

/**
 * The result as the person is shown it: the opt-in gates applied (matching/v2/gates.ts). A
 * belief-gated career path without the person's opt-in is capped at "possible", carries its note and
 * is left out of top lists, directions and the report; it stays in the full map. The fit itself is
 * unchanged, so the native result stays the source for "How you work best".
 */
const gatedFor = cache((profile: ProfileScores, faith: boolean): V2Memo => {
  const base = matchV2Memo(profile);
  const result = applyGates(base.result, V2_CONFIG, { faith });
  return result === base.result ? base : { result, byLane: new Map(result.lanes.map((l) => [l.laneId, l])), adapted: toV1Matches(result) };
});
const viewFor = (profile: ProfileScores, exp: ExperienceAnswers) => gatedFor(profile, !!exp.openToFaith);

/** The row-shaped matches (lists, picks, trait connections), by career path, as shown. */
const matchesFor = (profile: ProfileScores, exp: ExperienceAnswers) => new Map(viewFor(profile, exp).adapted.map((m) => [m.laneId, m]));

const r1 = (x: number) => Math.round(x * 10) / 10;
/** A distribution as a JSON-safe range (results pass through unstable_cache, which turns NaN into null). */
const range = (d: Distribution | null | undefined): FitRange | null => (!d || !Number.isFinite(d.mean) ? null : { mean: r1(d.mean), p10: r1(d.p10), p90: r1(d.p90) });

function toRow(lane: Lane, m: LaneMatch, exp: ExperienceAnswers, n?: LaneMatchV2): LaneRowData {
  return {
    id: lane.id,
    name: lane.name,
    familyId: lane.family,
    familyName: getFamily(lane.family)!.name,
    entry: lane.entry,
    modes: laneModes(lane),
    band: m.band,
    vsAverage: m.vsAverage,
    se: m.se,
    considering: exp.considering.some((c) => c.laneId === lane.id),
    current: exp.current?.laneId === lane.id,
    fulfilment: n ? range(n.fulfilmentFit) : null,
    ability: n ? range(n.abilityFit) : null,
    provenance: n?.provenance ?? null,
    capNote: n?.capNote ?? null,
    gated: !!n?.hidden,
  };
}

export function buildLaneMap(profile: ProfileScores, exp: ExperienceAnswers): { rows: LaneRowData[]; vocab: LaneFilterVocab } {
  const matches = matchesFor(profile, exp);
  const native = viewFor(profile, exp).byLane;
  return {
    rows: LANES.map((l) => toRow(l, matches.get(l.id)!, exp, native?.get(l.id))),
    vocab: { families: FAMILIES.map((f) => ({ id: f.id, name: f.name })) },
  };
}

const toExperience = (exp: ExperienceAnswers): Experience => ({ laneId: exp.current?.laneId, roleId: exp.current?.roleId, years: exp.current?.years });

const CORPORATE_LADDERS = new Set(["corporate", "professional_firm"]);
const OWN_PATH_LADDERS = new Set(["independent", "performer", "creator", "founder"]);
/** Care, health, teaching, nonprofit and coaching work is never listed as corporate, even on a company-style ladder. */
const NOT_CORPORATE_FAMILIES = new Set(["healthcare", "care_social", "education"]);
const NOT_CORPORATE_LANES = new Set(["sports_coaching"]);
/** Corporate needs a company ladder and private employment as the main mode (politics and public health use the corporate ladder too). */
export const careerCategory = (lane: Pick<Lane, "id" | "family" | "ladder" | "modes">): CareerCategory =>
  CORPORATE_LADDERS.has(lane.ladder) && lane.modes[0] === "employed" && !NOT_CORPORATE_FAMILIES.has(lane.family) && !NOT_CORPORATE_LANES.has(lane.id)
    ? "corporate"
    : OWN_PATH_LADDERS.has(lane.ladder)
      ? "own_path"
      : "other";

const PICKS = 5;

/** A direction's title and subtitle, from its value mode (and family, when the mode was split by family). */
function directionText(mode: string, family: string | null): { name: string; subtitle: string } {
  const m = VALUE_MODES.find((x) => x.id === mode)!;
  return { name: family ? `${m.name}: ${getFamily(family as Lane["family"])?.name ?? family}` : `${m.name} (${m.archetype})`, subtitle: m.poles[1] };
}

/** The reasons a direction's career paths share: the two drivers most of them name. */
function sharedWhy(picks: CareerPick[]): string | null {
  const count = new Map<string, number>();
  for (const p of picks) for (const w of p.why.slice(0, 3)) count.set(w, (count.get(w) ?? 0) + 1);
  const top = [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([w]) => w);
  return top.length ? `Where they meet you: ${top.join(" and ")}.` : null;
}

/**
 * The Career map's result lists. First the strong fits as 3–4 named directions (owner's decision,
 * 2026-10-30; matching/v2/present.ts directionsOf), each with 2–3 career paths in fit order, shown
 * without rank numbers. Then the next five corporate and the next five non-corporate career paths
 * (not repeating the directions). Each is led by the specific starting role that fits the person
 * best inside it (matching/roles.ts). `overall` is the directions' career paths in order, for the
 * summary sheet, share card and trait connections. Belief-gated career paths without the person's
 * opt-in never appear here (they stay in the full map).
 */
export function buildCareerPicks(profile: ProfileScores, exp: ExperienceAnswers): CareerPicks {
  const matches = matchesFor(profile, exp);
  const view = viewFor(profile, exp);
  const native = view.byLane;
  const bandOrder = ["strong", "testing", "unlikely", "insufficient"];
  const ordered = LANES.map((lane) => ({ lane, m: matches.get(lane.id)! }))
    .filter((x) => x.m.band !== "insufficient" && !native.get(x.lane.id)?.hidden)
    .sort((a, b) => bandOrder.indexOf(a.m.band) - bandOrder.indexOf(b.m.band) || (b.m.vsAverage ?? -Infinity) - (a.m.vsAverage ?? -Infinity) || a.lane.name.localeCompare(b.lane.name));
  const experience = toExperience(exp);
  const pick = ({ lane, m }: (typeof ordered)[number]): CareerPick => {
    const ranked = rankRoles(lane, profile, taxonomy, experience, 3, roleDataFor(profile));
    const [first, ...rest] = ranked.top;
    return {
      row: toRow(lane, m, exp, native?.get(lane.id)),
      category: careerCategory(lane),
      role: first ? { title: first.role.title, levelLabel: taxonomy.levels[first.role.level].label, reason: first.reason, note: first.note } : null,
      alsoRoles: rest.map((r) => r.role.title),
      entryNote: ranked.entry.note,
      why: m.drivers.filter((d) => d.contribution > 0.01).slice(0, 3).map((d) => d.label),
      driverIds: m.drivers.filter((d) => d.contribution > 0.01).map((d) => d.id),
      ladder: ladderRows(lane, ranked.entry.level, ranked.entry.current).map((r) => ({ label: r.step ?? r.levelLabel, marker: r.marker })),
    };
  };
  const byId = new Map(ordered.map((x) => [x.lane.id as string, x]));
  const directions: CareerDirection[] = directionsOf(view.result, (id) => getLane(id)?.family ?? "").map((g) => {
    const picks = g.laneIds.flatMap((id) => (byId.has(id) ? [pick(byId.get(id)!)] : []));
    const info = { id: g.family ? `${g.mode}:${g.family}` : g.mode, ...directionText(g.mode, g.family), why: sharedWhy(picks) };
    return { ...info, picks: picks.map((p) => ({ ...p, direction: info })) };
  });
  const shown = new Set(directions.flatMap((d) => d.picks.map((p) => p.row.id as string)));
  const rest = ordered.filter((x) => !shown.has(x.lane.id));
  return {
    directions,
    overall: directions.flatMap((d) => d.picks),
    corporate: rest.filter((x) => careerCategory(x.lane) === "corporate").slice(0, PICKS).map(pick),
    ownPath: rest.filter((x) => careerCategory(x.lane) === "own_path").slice(0, PICKS).map(pick),
  };
}

function ladderRows(lane: Lane, start: LevelId | null, current: LevelId | null): LadderRow[] {
  const ladder = ladderOf(lane);
  const stepText = new Map(ladder.steps.map(([level, text]) => [level, text]));
  const levels = LEVELS.filter((l) => stepText.has(l) || lane.roles.some((r) => r.level === l));
  const startIdx = start ? levels.indexOf(start) : -1;
  return levels.map((level, i) => ({
    level,
    levelLabel: taxonomy.levels[level].label,
    step: stepText.get(level) ?? null,
    roles: lane.roles.filter((r) => r.level === level).map(roleRef),
    marker: level === current ? "current" : i === startIdx ? "start" : startIdx >= 0 && i > startIdx ? "above" : "below",
  }));
}


export function buildLaneDetail(id: string, profile: ProfileScores, exp: ExperienceAnswers): LaneDetail | null {
  const lane = getLane(id);
  if (!lane) return null;
  const m = matchesFor(profile, exp).get(lane.id)!;
  const n = viewFor(profile, exp).byLane.get(lane.id)!;
  const ranked = rankRoles(lane, profile, taxonomy, toExperience(exp), 3, roleDataFor(profile));
  return {
    row: toRow(lane, m, exp, n),
    description: lane.description,
    riasec: lane.riasec,
    entryText: taxonomy.entry[lane.entry],
    dayToDay: lane.tags.map((t) => TAG_NOUN[t]),
    ladderName: ladderOf(lane).name,
    ladder: ladderRows(lane, ranked.entry.level, ranked.entry.current),
    entryNote: ranked.entry.note,
    topRoles: ranked.top.map((t) => ({ role: roleRef(t.role), reason: t.reason, note: t.note })),
    isco: Object.entries(lane.isco_labels).map(([code, label]) => ({ code, label })),
    day: typicalDay(lane.id),
    v2: {
      fulfilment: range(n.fulfilmentFit),
      ability: range(n.abilityFit),
      // The share the band rests on (with the ensemble, the smaller of need-weighted and flat), so the two always agree.
      pTop: Math.round((n.pTopBand ?? n.pTop) * 100) / 100,
      bothWeightings: n.pTopBand !== undefined,
      drivers: n.drivers.map(fitDriver),
      frictions: n.frictions.map(fitDriver),
      dims: dimRows(lane.id, profile),
    },
  };
}

const fitDriver = (d: { id: string; label: string; contribution: number }): FitDriver => ({ id: d.id, label: d.label, contribution: r1(d.contribution) });

/**
 * You against the career on the value modes and working conditions: your Work Design scores with
 * their 90% intervals, and the career's O*NET-based levels. The two are different rulers (yours is
 * anchored on the questionnaire scales, the career's is a percentile across occupations), which the
 * detail panel says. For working conditions, `gap` is the mismatch on the side that can hurt.
 */
function dimRows(laneId: string, profile: ProfileScores): DimRow[] {
  const wd = personWorkDesign(matchingProfile(profile), undefined, V2_CONFIG.inputs);
  const career = LANE_PROFILES_V2[laneId];
  const z = 1.645;
  const you = (v: number | null, se: number | null) =>
    v === null || se === null ? { you: null, lo: null, hi: null } : { you: r1(v), lo: r1(Math.max(0, v - z * se)), hi: r1(Math.min(100, v + z * se)) };
  const num = (x: number | null | undefined) => (x === null || x === undefined ? null : r1(x));
  return [
    ...VALUE_MODES.map((d): DimRow => {
      const s = wd.valueModes.find((x) => x.id === d.id)!;
      return { id: `mode.${d.id}`, group: "mode", name: d.name, archetype: d.archetype, poles: d.poles, ...you(s.value, s.se), career: num(career?.modes[d.id]) };
    }),
    ...ENVIRONMENT.map((d): DimRow => {
      const s = wd.environment.find((x) => x.id === d.id)!;
      const c = num(career?.environment[d.id]);
      return { id: `env.${d.id}`, group: "condition", name: d.name, poles: d.poles, ...you(s.value, s.se), career: c, penalty: d.penalty, gap: s.value === null || c === null ? null : r1(penaltyOf(d.penalty!, s.value, c)) };
    }),
  ];
}

/** "How you work best" for the profile: archetype blend, value modes, working conditions and drains. */
export const workBestFor = cache((profile: ProfileScores): WorkBest => workBest(personWorkDesign(matchingProfile(profile), undefined, V2_CONFIG.inputs), nativeFor(profile).result, LANE_PROFILES_V2));

export const laneName = (id: string) => getLane(id)?.name ?? id;

export const isKnownLane = (id: string): id is LaneId => !!getLane(id);

/**
 * Career paths for the written report: the directions' career paths, each with its direction (no
 * ranking: owner's decision, 2026-10-30), plus the ones the person is considering or works in now,
 * whatever their band. Under matching v2 each carries both fits and its frictions; "what the work
 * involves" is the career's top O*NET work activities when it has them.
 */
export function reportLanes(profile: ProfileScores, exp: ExperienceAnswers): ReportCareerPath[] {
  const matches = matchesFor(profile, exp);
  const native = viewFor(profile, exp).byLane;
  const inDirection = new Map(buildCareerPicks(profile, exp).overall.map((p) => [p.row.id as string, p.direction?.name ?? null]));
  const picked = new Map<string, ReportCareerPath["listedBecause"]>([...inDirection.keys()].map((id) => [id, "strong_fit"]));
  for (const c of exp.considering) picked.set(c.laneId, "considering");
  if (exp.current) picked.set(exp.current.laneId, "current_job");
  return [...picked].flatMap(([id, why]) => {
    const lane = getLane(id);
    const m = matches.get(id as LaneId);
    if (!lane || !m) return [];
    const n = native?.get(id);
    const day = typicalDay(id);
    return [
      {
        name: lane.name,
        family: getFamily(lane.family)!.name,
        band: m.band === "testing" ? "possible" : m.band,
        fulfilmentFit: n ? range(n.fulfilmentFit) : null,
        abilityFit: n ? range(n.abilityFit) : null,
        estimatedProfile: n?.provenance === "estimated",
        talentNote: n?.capNote ?? null,
        drivers: n ? n.drivers.map((d) => d.label) : m.drivers.filter((d) => d.contribution > 0).map((d) => d.label),
        frictions: n ? n.frictions.map((d) => d.label) : m.drivers.filter((d) => d.contribution < 0).map((d) => d.label),
        entry: taxonomy.entry[lane.entry],
        dayToDay: day?.activities.length ? day.activities.map((a) => a.name) : lane.tags.map((t) => TAG_NOUN[t]),
        listedBecause: why,
        direction: inDirection.get(id) ?? null,
      },
    ];
  });
}
