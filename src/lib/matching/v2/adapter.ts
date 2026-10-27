/**
 * Matching v2 in v1's LaneMatch shape, so the current Career map, report facts and picks work
 * with either version (MATCHING_VERSION). The v2-only data (distributions, ability fit, frictions,
 * archetype blend, provenance) is used directly from Phase 3 on. Pure.
 *
 * - band: strong → strong, possible → testing ("Possible fit"), unlikely → unlikely.
 * - fit: expected fulfilment fit (T-like, 50 = the person's average career path).
 * - vsAverage / se: that fit as z units around the person's average career path, and its SD over
 *   draws, which is what the fit indicator draws.
 * - drivers: positive drivers then frictions, contributions in the same z units, ids mapped to the
 *   construct ids the trait-connection view reads (interests.R, values.independence, …).
 */
import type { Band, LaneMatch } from "../fit";
import type { LaneId } from "../../taxonomy/generated";
import type { BandV2, Driver, MatchResultV2 } from "./types";

const BAND: Record<BandV2, Band> = { strong: "strong", possible: "testing", unlikely: "unlikely", insufficient: "insufficient" };

/** v2 driver id → v1 construct id (modes and environment have no single construct: kept as they are). */
const constructId = (d: Driver) => (d.id.startsWith("values.") ? `values.${d.id.slice(7).toLowerCase().replace(/\s+/g, "_")}` : d.id);

export function toV1Matches(r: MatchResultV2): LaneMatch[] {
  return r.lanes.map((l) => {
    const ok = !Number.isNaN(l.fulfilmentFit.mean);
    const z = (d: Driver) => ({ id: constructId(d), label: d.label, contribution: Math.round((d.contribution / 10) * 1000) / 1000 });
    return {
      laneId: l.laneId as LaneId,
      band: BAND[l.band],
      fit: ok ? l.fulfilmentFit.mean : null,
      se: ok ? l.fulfilmentFit.sd / 10 : null,
      vsAverage: ok ? (l.fulfilmentFit.mean - 50) / 10 : null,
      drivers: [...l.drivers.map(z), ...l.frictions.map(z)],
      unscoredTags: [],
    };
  });
}
