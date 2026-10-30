/**
 * Presentation data from a v2 result: the strong fits as named directions (directionsOf; what the
 * app shows), plus the top five and the best career path per value mode (scripts and validation). "Where
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

/** Shown in top lists: scored, and not hidden by an opt-in gate (gates.ts). */
const listable = (l: LaneMatchV2) => l.band !== "insufficient" && !l.hidden;

export function topFive(r: MatchResultV2): TopPick[] {
  return rankV2(r.lanes.filter(listable)).slice(0, 5).map(pick);
}

/** The best career path per direction (the career's own leading value mode), best direction first. */
export function bestByDirection(r: MatchResultV2): (TopPick & { direction: string; directionLabel: string })[] {
  const out: (TopPick & { direction: string; directionLabel: string })[] = [];
  for (const m of VALUE_MODES) {
    const best = rankV2(r.lanes.filter((l) => l.direction === m.id && listable(l)))[0];
    if (best) out.push({ ...pick(best), direction: m.id, directionLabel: `${m.name} (${m.archetype})` });
  }
  return out.sort((a, b) => BAND_RANK[a.band] - BAND_RANK[b.band] || b.fulfilment - a.fulfilment);
}

export type DirectionGroup = {
  /** The value mode the career paths in it lead with. */
  mode: string;
  /** Set when a large mode group was split by family: the family the direction is about. */
  family: string | null;
  /** 2–3 career paths, by expected fulfilment fit (shown without rank numbers). */
  laneIds: string[];
};

/**
 * The strong fits as 3–4 named directions (owner's decision, 2026-10-30), not a ranking. Strong fits
 * are grouped by the career's own leading value mode; a mode group with more than `per` career paths
 * that spans two or more families with at least two each is split by family. Directions are ordered
 * by their best fit; each keeps up to `per` career paths (at most two from one family), and one
 * with fewer than two is filled with the next best career path in the same mode. With fewer than
 * `min` directions among the strong fits, the best possible fits form the rest. Hidden (gated)
 * career paths never appear. Pure.
 */
export function directionsOf(r: MatchResultV2, familyOf: (laneId: string) => string, opts: { max?: number; min?: number; per?: number } = {}): DirectionGroup[] {
  const max = opts.max ?? 4;
  const min = opts.min ?? 3;
  const per = opts.per ?? 3;
  const visible = rankV2(r.lanes.filter((l) => listable(l) && l.direction !== null));
  const byMode = (ls: LaneMatchV2[]) => {
    const m = new Map<string, LaneMatchV2[]>();
    for (const l of ls) m.set(l.direction!, [...(m.get(l.direction!) ?? []), l]);
    return m;
  };
  const groups: { mode: string; family: string | null; lanes: LaneMatchV2[] }[] = [];
  for (const [mode, ls] of byMode(visible.filter((l) => l.band === "strong"))) {
    const fams = new Map<string, LaneMatchV2[]>();
    for (const l of ls) fams.set(familyOf(l.laneId), [...(fams.get(familyOf(l.laneId)) ?? []), l]);
    const big = [...fams].filter(([, x]) => x.length >= 2);
    if (ls.length > per && big.length >= 2) {
      for (const [family, x] of big) groups.push({ mode, family, lanes: x });
      const rest = ls.filter((l) => !big.some(([f]) => f === familyOf(l.laneId)));
      if (rest.length) groups.push({ mode, family: null, lanes: rest });
    } else groups.push({ mode, family: null, lanes: ls });
  }
  const best = (g: { lanes: LaneMatchV2[] }) => g.lanes[0]!.fulfilmentFit.mean;
  groups.sort((a, b) => best(b) - best(a));
  const chosen = groups.slice(0, max);
  // Too few strong directions: the best possible fits, by mode, make up the rest.
  if (chosen.length < min) {
    const used = new Set(chosen.map((g) => g.mode));
    for (const [mode, ls] of byMode(visible.filter((l) => l.band === "possible"))) {
      if (chosen.length >= min) break;
      if (!used.has(mode)) chosen.push({ mode, family: null, lanes: ls });
    }
  }
  // Two passes: every direction first claims its own career paths, then a direction of one is
  // filled, so a fill never takes a career path that belongs to a later direction.
  const taken = new Set<string>();
  const filled = chosen.map((g) => {
    const out: LaneMatchV2[] = [];
    const perFamily = new Map<string, number>();
    const add = (l: LaneMatchV2) => {
      const f = familyOf(l.laneId);
      if (taken.has(l.laneId) || (g.family === null && (perFamily.get(f) ?? 0) >= 2)) return;
      out.push(l);
      taken.add(l.laneId);
      perFamily.set(f, (perFamily.get(f) ?? 0) + 1);
    };
    for (const l of g.lanes) if (out.length < per) add(l);
    return { g, out, add };
  });
  return filled.map(({ g, out, add }) => {
    // A direction of one: the next best career path that leads with the same mode.
    for (const l of visible) if (out.length < 2 && l.direction === g.mode && (g.family === null || familyOf(l.laneId) === g.family)) add(l);
    return { mode: g.mode, family: g.family, laneIds: out.map((l) => l.laneId) };
  });
}

