/**
 * Roles inside a lane (taxonomy matching rules 2 and 3). Pure.
 *
 * - The entry point is the level the person can reach today: trainee/entry, or their own level
 *   when they already work in the lane. Seniority is a path, never a recommendation.
 * - Starting roles are ranked by their tags through tag_to_constructs. Manager, director and
 *   exec roles are never starting roles; owner roles only on the founder ladder.
 */
import type { Lane, LevelId, Role, TagId, Taxonomy } from "../taxonomy/generated";
import type { ProfileScores } from "../scoring/profile";
import { constructTable, type TaxonomyForMatching } from "./fit";

export type YearsBand = "0" | "lt2" | "2to5" | "5plus";
/** What the person told us in onboarding: their current role (if any) and years in it. */
export type Experience = { roleId?: string | null; laneId?: string | null; years?: YearsBand | null };

export type EntryNote =
  /** No experience in this lane: start at trainee/entry. */
  | "standard"
  /** Already works in this lane: start from their own level. */
  | "from_experience"
  /** The lane has no junior roles; people usually move in from another lane at mid level. */
  | "via_other_lane"
  /** The lane only has senior roles; it needs substantial prior experience elsewhere. */
  | "needs_experience";

export type EntryPoint = { level: LevelId | null; current: LevelId | null; note: EntryNote };

export type RoleRecommendation = { role: Role; score: number | null; reason: string };

type TaxonomyForRoles = TaxonomyForMatching & Pick<Taxonomy, "levels">;

/** Only on the founder ladder is owning the business the way in; elsewhere it's the top of the path. */
const OWNER_START_LADDERS = new Set(["founder"]);
const YEARS_LEVEL: Record<YearsBand, LevelId> = { "0": "entry", lt2: "entry", "2to5": "mid", "5plus": "senior" };

export function entryPoint(lane: Lane, taxonomy: Pick<Taxonomy, "levels">, exp: Experience = {}): EntryPoint {
  const order = Object.keys(taxonomy.levels) as LevelId[];
  const ic = order.filter((l) => taxonomy.levels[l].track === "ic");
  const present = new Set(lane.roles.map((r) => r.level));
  const lowestIc = ic.find((l) => present.has(l)) ?? null;

  if (exp.laneId === lane.id) {
    const own = lane.roles.find((r) => r.id === exp.roleId)?.level ?? null;
    const target = YEARS_LEVEL[exp.years ?? "lt2"];
    // The highest level present in the lane at or below what their years suggest.
    const reachable = ic.filter((l) => present.has(l) && ic.indexOf(l) <= ic.indexOf(target)).pop() ?? lowestIc;
    return { level: reachable, current: own, note: "from_experience" };
  }
  if (present.has("entry")) return { level: "entry", current: null, note: "standard" };
  if (present.has("trainee")) return { level: "trainee", current: null, note: "standard" };
  if (lowestIc === "mid") return { level: "mid", current: null, note: "via_other_lane" };
  return { level: lowestIc, current: null, note: "needs_experience" };
}

/** Starting-role candidates for an entry point. Never management. */
export function startingRoles(lane: Lane, taxonomy: Pick<Taxonomy, "levels">, ep: EntryPoint): Role[] {
  if (ep.note === "needs_experience" || !ep.level) return [];
  const levels = new Set<LevelId>(ep.note === "standard" ? ["trainee", "entry"] : [ep.level]);
  return lane.roles.filter(
    (r) =>
      taxonomy.levels[r.level].track !== "mgmt" &&
      (levels.has(r.level) || (r.level === "owner" && OWNER_START_LADDERS.has(lane.ladder))),
  );
}

/** Short noun for each demand tag, used as the subject of a reason. Keyed by TagId, so a
 *  taxonomy rebuild that adds or renames a tag fails the type check here. */
export const TAG_NOUN: Record<TagId, string> = {
  hunting: "Finding new customers",
  relationship: "Long-term relationship building",
  persuasion: "Persuading people",
  negotiation: "Negotiating",
  technical: "Deep technical knowledge",
  analytical: "Analysing complex problems",
  numbers: "Working with numbers",
  writing: "Writing",
  creative: "Coming up with original ideas",
  aesthetic: "Visual and sensory judgement",
  building: "Building and making things",
  physical: "Physical work",
  outdoor: "Working outdoors",
  precision: "Precise, careful work",
  care: "Caring for people",
  teaching: "Teaching and explaining",
  leadership: "Leading people",
  visible: "Being visible to an audience",
  solo: "Working alone",
  team: "Close teamwork",
  variable_pay: "Variable pay",
  risk: "Taking risks",
  routine: "Repeatable, structured work",
  shift: "Shifts and irregular hours",
  travel: "Travel",
  pressure: "Working under pressure",
  competition: "Competition",
  practice: "Long, deliberate practice",
  autonomy: "Setting your own direction",
  detail: "Attention to detail",
};

function strength(d: number) {
  if (d >= 0.5) return "one of your stronger scores";
  if (d >= 0) return "above your own average";
  return "not a strength for you, but the closest match in this lane";
}

export function rankRoles(lane: Lane, profile: ProfileScores, taxonomy: TaxonomyForRoles, exp: Experience = {}, limit = 3) {
  const ep = entryPoint(lane, taxonomy, exp);
  const t = constructTable(profile, taxonomy);
  const tagScore = (tag: TagId) => {
    const cs = (taxonomy.tag_to_constructs[tag] ?? []).map((c) => t.table.get(c)).filter((c) => !!c);
    if (!cs.length) return null;
    const best = cs.reduce((a, c) => (c.z > a.z ? c : a));
    return { score: cs.reduce((a, c) => a + (c.z - t.mean), 0) / cs.length, best: { label: best.label, d: best.z - t.mean } };
  };
  const levelPref = (l: LevelId) => ["entry", "trainee", "mid", "senior", "lead", "owner"].indexOf(l);

  const ranked: RoleRecommendation[] = startingRoles(lane, taxonomy, ep)
    .map((role) => {
      const scored = role.tags.map((tag) => ({ tag, s: tagScore(tag) })).filter((x) => x.s !== null);
      const score = scored.length ? scored.reduce((a, x) => a + x.s!.score, 0) / scored.length : null;
      // Explain with what sets this role apart from the rest of the lane when that's a plus for
      // the person; otherwise with the role's best-matching demand.
      const best = (xs: typeof scored) => xs.reduce<(typeof scored)[number] | null>((a, x) => (!a || x.s!.score > a.s!.score ? x : a), null);
      const own = best(scored.filter((x) => !lane.tags.includes(x.tag)));
      const top = own && own.s!.score > 0 ? own : best(scored);
      const reason = top
        ? `${TAG_NOUN[top.tag]} draws on your ${top.s!.best.label}, ${strength(top.s!.best.d)}.`
        : "Its demands draw on scales Lane is still validating, so it can't be ranked for you yet.";
      return { role, score, reason };
    })
    .sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity) || levelPref(a.role.level) - levelPref(b.role.level) || a.role.title.localeCompare(b.role.title));

  return { entry: ep, top: ranked.slice(0, limit) };
}
