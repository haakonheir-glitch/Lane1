/**
 * Presentation data from a v2 result: the top five, and the best career path in each direction
 * (value-mode cluster), so different directions are visible without changing the ranking. "Where
 * you'd start" stays with the v1 role and seniority logic (src/lib/matching/roles.ts), applied by
 * the data layer. Pure.
 */
import { VALUE_MODES } from "../../workdesign/model";
import type { BandV2, LaneMatchV2, MatchResultV2 } from "./types";

const BAND_RANK: Record<BandV2, number> = { strong: 0, possible: 1, unlikely: 2, insufficient: 3 };

/** Strong band first, then by expected fulfilment fit; ties by name. */
export function rankV2(lanes: LaneMatchV2[]): LaneMatchV2[] {
  return [...lanes].sort(
    (a, b) => BAND_RANK[a.band] - BAND_RANK[b.band] || (Number.isNaN(b.fulfilmentFit.mean) ? -1 : b.fulfilmentFit.mean) - (Number.isNaN(a.fulfilmentFit.mean) ? -1 : a.fulfilmentFit.mean) || a.name.localeCompare(b.name),
  );
}

export type TopPick = { laneId: string; name: string; band: BandV2; fulfilment: number; ability: number | null; provenance: LaneMatchV2["provenance"] };

const pick = (l: LaneMatchV2): TopPick => ({ laneId: l.laneId, name: l.name, band: l.band, fulfilment: l.fulfilmentFit.mean, ability: l.abilityFit?.mean ?? null, provenance: l.provenance });

export function topFive(r: MatchResultV2): TopPick[] {
  return rankV2(r.lanes.filter((l) => l.band !== "insufficient")).slice(0, 5).map(pick);
}

/** The best career path per direction (the career's own leading value mode), best direction first. */
export function bestByDirection(r: MatchResultV2): (TopPick & { direction: string; directionLabel: string })[] {
  const out: (TopPick & { direction: string; directionLabel: string })[] = [];
  for (const m of VALUE_MODES) {
    const best = rankV2(r.lanes.filter((l) => l.direction === m.id && l.band !== "insufficient"))[0];
    if (best) out.push({ ...pick(best), direction: m.id, directionLabel: `${m.name} (${m.archetype})` });
  }
  return out.sort((a, b) => BAND_RANK[a.band] - BAND_RANK[b.band] || b.fulfilment - a.fulfilment);
}
