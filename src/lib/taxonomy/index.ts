/**
 * The lane taxonomy (./taxonomy), loaded at build time. Server only: the full file is ~800 KB,
 * so pages pass small summaries to the client instead (see `laneSummary`).
 *
 * Never edit taxonomy/taxonomy.json by hand: edit taxonomy/src/*.txt, run
 * `python3 taxonomy/build/build.py`, then `npm run taxonomy:types`.
 */
import "server-only";
import { z } from "zod";
import raw from "@taxonomy/taxonomy.json";
import type { Family, Ladder, Lane, LaneId, LevelId, ModeId, Role, Taxonomy } from "./generated";

export type * from "./generated";

/** Structure and cross-reference check: fails the build (and every page) on a bad rebuild. */
export function validateTaxonomy(t: unknown): Taxonomy {
  const base = z
    .object({
      levels: z.record(z.string(), z.object({ track: z.string(), label: z.string(), typical_years: z.string() })),
      modes: z.array(z.string()),
      entry: z.record(z.string(), z.string()),
      sprint: z.record(z.string(), z.string()),
      tags: z.record(z.string(), z.string()),
      tag_to_constructs: z.record(z.string(), z.array(z.string()).min(1)),
      ladders: z.record(z.string(), z.object({ name: z.string(), steps: z.array(z.tuple([z.string(), z.string()])).min(1) })),
    })
    .passthrough()
    .parse(t);
  const oneOf = (vals: string[]) => z.string().refine((v) => vals.includes(v), { message: `not one of ${vals.join(", ")}` });
  const level = oneOf(Object.keys(base.levels));
  const mode = oneOf(base.modes);
  const tag = oneOf(Object.keys(base.tags));
  const role = z.object({
    id: z.string(),
    title: z.string().min(1),
    level,
    track: oneOf([...new Set(Object.values(base.levels).map((l) => l.track))]),
    mode,
    aka: z.array(z.string()),
    tags: z.array(tag),
  });
  const lane = z.object({
    id: z.string(),
    name: z.string(),
    family: z.string(),
    description: z.string(),
    isco: z.array(z.string()),
    riasec: z.string().regex(/^[RIASEC]{1,3}$/),
    entry: oneOf(Object.keys(base.entry)),
    sprint: oneOf(Object.keys(base.sprint)),
    modes: z.array(mode).min(1),
    ladder: oneOf(Object.keys(base.ladders)),
    tags: z.array(tag),
    status: z.string(),
    isco_labels: z.record(z.string(), z.string()),
    roles: z.array(role).min(1),
  });
  const parsed = z.object({ families: z.array(z.object({ id: z.string(), name: z.string(), description: z.string(), lanes: z.array(lane).min(1) })) }).passthrough().parse(t);

  const seen = new Set<string>();
  for (const f of parsed.families)
    for (const l of f.lanes) {
      if (l.family !== f.id) throw new Error(`taxonomy: lane ${l.id} says family ${l.family} but sits in ${f.id}`);
      for (const id of [l.id, ...l.roles.map((r) => r.id)]) {
        if (seen.has(id)) throw new Error(`taxonomy: duplicate id ${id}`);
        seen.add(id);
      }
      for (const r of l.roles) if (!r.id.startsWith(`${l.id}.`)) throw new Error(`taxonomy: role ${r.id} is not under lane ${l.id}`);
    }
  for (const k of Object.keys(base.tag_to_constructs)) if (!(k in base.tags)) throw new Error(`taxonomy: tag_to_constructs has unknown tag ${k}`);
  return t as Taxonomy;
}

export const taxonomy: Taxonomy = validateTaxonomy(raw);

export const FAMILIES: Family[] = taxonomy.families;
export const LANES: Lane[] = FAMILIES.flatMap((f) => f.lanes);

/** Seniority order as given by the taxonomy (trainee → … → owner). */
export const LEVELS = Object.keys(taxonomy.levels) as LevelId[];
export const levelRank = (l: LevelId) => LEVELS.indexOf(l);
export const isManagement = (l: LevelId) => taxonomy.levels[l].track === "mgmt";

const laneById = new Map<string, Lane>(LANES.map((l) => [l.id, l]));
const roleById = new Map<string, { role: Role; lane: Lane }>(LANES.flatMap((l) => l.roles.map((r) => [r.id, { role: r, lane: l }] as const)));
const familyById = new Map<string, Family>(FAMILIES.map((f) => [f.id, f]));

export const getLane = (id: string): Lane | undefined => laneById.get(id);
export const getRole = (id: string) => roleById.get(id);
export const getFamily = (id: string): Family | undefined => familyById.get(id);
export const ladderOf = (lane: Lane): Ladder => taxonomy.ladders[lane.ladder];
export const isLaneId = (id: string): id is LaneId => laneById.has(id);

/** Work modes available in a lane: the lane's own list plus every role's mode (PLAN D37). */
export const laneModes = (lane: Lane): ModeId[] => taxonomy.modes.filter((m) => lane.modes.includes(m) || lane.roles.some((r) => r.mode === m));

/** What the browser needs to list and filter a lane: no roles, no ISCO detail. */
export type LaneSummary = Pick<Lane, "id" | "name" | "family" | "description" | "riasec" | "entry" | "sprint" | "ladder"> & {
  modes: ModeId[];
  roleCount: number;
};
export const laneSummary = (l: Lane): LaneSummary => ({
  id: l.id,
  name: l.name,
  family: l.family,
  description: l.description,
  riasec: l.riasec,
  entry: l.entry,
  sprint: l.sprint,
  ladder: l.ladder,
  modes: laneModes(l),
  roleCount: l.roles.length,
});

/* ---------------------------------------------------------------- search ---- */

import escoIndex from "./esco.generated.json";
import { buildSearchIndex, searchTitles } from "./search";

let searchIndex: ReturnType<typeof buildSearchIndex> | null = null;

/** Job-title search over role titles, aliases and ESCO labels, resolved to lane and role names. */
export function findJobTitles(query: string, limit = 8) {
  searchIndex ??= buildSearchIndex(LANES, escoIndex as [string, string, string | null][]);
  return searchTitles(searchIndex, query, limit).flatMap((h) => {
    const lane = getLane(h.laneId);
    if (!lane) return [];
    const role = h.roleId ? getRole(h.roleId)?.role : undefined;
    // ESCO's lane assignment was reviewed; its nearest role is approximate (taxonomy README), so an
    // ESCO hit resolves to the lane only and the role is just a hint.
    const approx = h.source === "esco";
    return [
      {
        ...h,
        roleId: approx ? null : h.roleId,
        laneName: lane.name,
        familyName: getFamily(lane.family)!.name,
        roleTitle: approx ? null : (role?.title ?? null),
        nearestRole: approx ? (role?.title ?? null) : null,
      },
    ];
  });
}
export type JobTitleHit = ReturnType<typeof findJobTitles>[number];
