/**
 * Opt-in gates on a v2 result (owner's decision, 2026-10-30), the same mechanism as the talent cap:
 * a config list and a note. A belief-gated career path (one that requires a personal faith) is
 * shown in top lists, directions and the report only when the person has said they're open to
 * faith-based work. Otherwise it is capped at "possible fit", marked hidden (kept in the full map)
 * and carries BELIEF_NOTE. The fit itself is unchanged: this is about what is suggested. Pure.
 */
import { BELIEF_NOTE, type V2Config } from "./config";
import type { BandV2, MatchResultV2 } from "./types";

export type OptIns = { faith: boolean };

export function applyGates(r: MatchResultV2, cfg: V2Config, optIns: OptIns): MatchResultV2 {
  if (!cfg.beliefGated.length || optIns.faith) return r;
  const gated = new Set(cfg.beliefGated);
  const lanes = r.lanes.map((l) => {
    if (!gated.has(l.laneId)) return l;
    const capped = l.band === "strong";
    return { ...l, band: (capped ? "possible" : l.band) as BandV2, ...(capped ? { cappedFrom: "strong" as const } : {}), capNote: BELIEF_NOTE, hidden: true };
  });
  const bandCounts: Record<BandV2, number> = { strong: 0, possible: 0, unlikely: 0, insufficient: 0 };
  for (const l of lanes) bandCounts[l.band]++;
  return { ...r, lanes, bandCounts };
}
