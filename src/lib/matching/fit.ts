/**
 * Shared match shapes and the construct table. Career fit itself is matching v2
 * (src/lib/matching/v2, docs/MATCHING_V2.md); matching v1 (`matchLanes`) was removed on
 * 2026-10-28 once v2 was approved (design/REMOVED.md). What stays here:
 * - `LaneMatch`, `Band`, `Driver`: the row shape the lists, picks and trait connections read,
 *   filled from v2 by src/lib/matching/v2/adapter.ts;
 * - `constructTable`: each construct relative to the person's own average, which the role
 *   ranking inside a career path (roles.ts, "where you'd start") uses;
 * - the band order, labels and sort.
 */
import type { ProfileScores } from "../scoring/profile";
import type { LaneId, TagId, Taxonomy } from "../taxonomy/generated";
import { isResolved, resolveConstruct, type Resolved } from "./constructs";

export type Band = "strong" | "testing" | "unlikely" | "insufficient";
export type Driver = { id: string; label: string; contribution: number };

export type LaneMatch = {
  laneId: LaneId;
  band: Band;
  /** Fulfilment fit on the z scale ((fit − 50) / 10 from v2); null when there isn't enough data. */
  fit: number | null;
  /** Its spread over the draws, on the same scale. */
  se: number | null;
  /** Fit against the person's average career path (the same as `fit` under v2). */
  vsAverage: number | null;
  /** v2 drivers then frictions, ids mapped to construct ids (for the trait connections). */
  drivers: Driver[];
  /** Always empty under v2 (kept for the row shape). */
  unscoredTags: TagId[];
};

export type TaxonomyForMatching = Pick<Taxonomy, "families" | "tag_to_constructs">;


/** Every construct the taxonomy can ask about, resolved once against the profile. */
export function constructTable(profile: ProfileScores, taxonomy: TaxonomyForMatching) {
  const ids = new Set<string>(["interests.R", "interests.I", "interests.A", "interests.S", "interests.E", "interests.C"]);
  for (const cs of Object.values(taxonomy.tag_to_constructs)) for (const c of cs) ids.add(c);
  const table = new Map<string, Resolved>();
  for (const id of ids) {
    const r = resolveConstruct(id, profile);
    if (isResolved(r)) table.set(id, r);
  }
  // The person's own average, over distinct underlying scales (a "(-)" twin is the same scale).
  const base = [...table.values()].filter((r) => !r.id.endsWith("(-)"));
  const mean = base.length ? base.reduce((a, r) => a + r.z, 0) / base.length : 0;
  const known = [...table.values()].map((r) => r.reliability).filter((r): r is number => r !== null);
  // Ipsative values have no reliability; use the least reliable known scale (conservative).
  // With nothing known, assume none (r = 0): the widest possible error.
  const fallbackReliability = known.length ? Math.min(...known) : 0;
  return { table, mean, fallbackReliability };
}

export const BAND_ORDER: Band[] = ["strong", "testing", "unlikely", "insufficient"];
export const bandLabel: Record<Band, string> = {
  strong: "Strong fit",
  testing: "Possible fit",
  unlikely: "Unlikely",
  insufficient: "Not enough data",
};

/** Sort by band, then by fit within a band; ties broken by name so the order is stable. */
type Sortable = Pick<LaneMatch, "band" | "vsAverage">;
export function sortMatches<T extends { match: Sortable; name: string }>(xs: T[]): T[] {
  const key = (m: Sortable) => m.vsAverage ?? -Infinity;
  return [...xs].sort((a, b) => BAND_ORDER.indexOf(a.match.band) - BAND_ORDER.indexOf(b.match.band) || key(b.match) - key(a.match) || a.name.localeCompare(b.name));
}
