/**
 * Matching v2 in v1's LaneMatch shape, so the current Career map, report facts and picks work
 * with either version (MATCHING_VERSION). The v2-only data (distributions, ability fit, frictions,
 * archetype blend) is used directly from Phase 3 on. Pure.
 *
 * - band: strong → strong, possible → testing ("Possible fit"), unlikely → unlikely.
 * - fit: expected fulfilment fit (0–100).
 * - vsAverage / se: the career path's expected fulfilment against the person's average career
 *   path, in units of the spread across career paths, so the existing fit indicator reads it.
 */
import type { Band, LaneMatch } from "../fit";
import type { LaneId } from "../../taxonomy/generated";
import type { BandV2, MatchResultV2 } from "./types";

const BAND: Record<BandV2, Band> = { strong: "strong", possible: "testing", unlikely: "unlikely", insufficient: "insufficient" };

export function toV1Matches(r: MatchResultV2): LaneMatch[] {
  const means = r.lanes.map((l) => l.fulfilmentFit.mean).filter((x) => !Number.isNaN(x));
  const avg = means.reduce((a, b) => a + b, 0) / Math.max(1, means.length);
  const spread = Math.sqrt(means.reduce((a, b) => a + (b - avg) ** 2, 0) / Math.max(1, means.length)) || 1;
  return r.lanes.map((l) => {
    const ok = !Number.isNaN(l.fulfilmentFit.mean);
    return {
      laneId: l.laneId as LaneId,
      band: BAND[l.band],
      fit: ok ? l.fulfilmentFit.mean : null,
      se: ok ? l.fulfilmentFit.sd / spread : null,
      vsAverage: ok ? (l.fulfilmentFit.mean - avg) / spread : null,
      drivers: [...l.drivers.map((d) => ({ id: d.id, label: d.label, contribution: d.contribution })), ...l.frictions.map((d) => ({ id: d.id, label: d.label, contribution: d.contribution }))],
      unscoredTags: [],
    };
  });
}
