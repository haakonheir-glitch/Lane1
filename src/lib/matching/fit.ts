/**
 * Lane fit: the single pure function the Lane Map uses (taxonomy matching rules 1, 4 and 6).
 *
 *   matchLanes(profile, taxonomy) → one LaneMatch per lane
 *
 * Fit is ipsative ("ranked against yourself"): every construct is taken relative to the
 * person's own average across all constructs the taxonomy uses. Half of a lane's fit is
 * RIASEC congruence (the lane's code letters, weighted 2:1:1), half is the lane's demand tags
 * scored through tag_to_constructs. Lanes are then put in bands with the BLUEPRINT §7
 * reliability rule instead of being ranked 1–205.
 */
import type { ProfileScores } from "../scoring/profile";
import { normalCdf, Z95 } from "../scoring/core";
import type { Lane, LaneId, TagId, Taxonomy } from "../taxonomy/generated";
import { isResolved, resolveConstruct, type Resolved } from "./constructs";
import { payoffCurve } from "./payoff";

export type Band = "strong" | "testing" | "unlikely" | "insufficient";
export type Driver = { id: string; label: string; contribution: number };

export type LaneMatch = {
  laneId: LaneId;
  band: Band;
  /** Relative fit in z units around the person's own average; null when there isn't enough data. */
  fit: number | null;
  /** Standard error of `fit`, from the reliabilities of the constructs behind it. */
  se: number | null;
  /** fit minus the person's average fit across all lanes (what the band is decided on). */
  vsAverage: number | null;
  /** The constructs that moved this lane most, strongest first (validated scales only). */
  drivers: Driver[];
  /** Lane tags that couldn't be scored yet (only experimental or unbuilt constructs behind them). */
  unscoredTags: TagId[];
  /** Expected position on the lane's payoff curve (0–1) and the fit × payoff sort key. */
  expectedPayoff: number | null;
  fitPayoff: number | null;
};

export type TaxonomyForMatching = Pick<Taxonomy, "families" | "tag_to_constructs">;

const RIASEC_WEIGHTS = [2, 1, 1];

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

type Table = ReturnType<typeof constructTable>;

/** Linear weights over constructs that make up a lane's fit. */
function laneWeights(lane: Pick<Lane, "riasec" | "tags">, t: Table, tagMap: Record<string, string[]>) {
  const interest = new Map<string, number>();
  const letters = lane.riasec.split("");
  let wSum = 0;
  letters.forEach((l, i) => {
    const id = `interests.${l}`;
    if (!t.table.has(id)) return;
    const w = RIASEC_WEIGHTS[i] ?? 1;
    interest.set(id, (interest.get(id) ?? 0) + w);
    wSum += w;
  });
  const tagParts: Map<string, number>[] = [];
  const unscored: TagId[] = [];
  for (const tag of lane.tags) {
    const cs = (tagMap[tag] ?? []).filter((c) => t.table.has(c));
    if (!cs.length) {
      unscored.push(tag as TagId);
      continue;
    }
    tagParts.push(new Map(cs.map((c) => [c, 1 / cs.length])));
  }
  if (wSum === 0) return { weights: null, unscored };
  const weights = new Map<string, number>();
  const add = (id: string, w: number) => weights.set(id, (weights.get(id) ?? 0) + w);
  const interestShare = tagParts.length ? 0.5 : 1;
  for (const [id, w] of interest) add(id, (interestShare * w) / wSum);
  for (const part of tagParts) for (const [id, w] of part) add(id, ((1 - interestShare) * w) / tagParts.length);
  return { weights, unscored };
}

function scoreWeights(weights: Map<string, number>, t: Table) {
  let fit = 0;
  const byLabel = new Map<string, Driver>();
  for (const [id, w] of weights) {
    const c = t.table.get(id)!;
    const contribution = w * (c.z - t.mean);
    fit += contribution;
    const d = byLabel.get(c.label) ?? { id, label: c.label, contribution: 0 };
    d.contribution += contribution;
    byLabel.set(c.label, d);
  }
  const drivers = [...byLabel.values()].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return { fit, drivers };
}

/** Error variance of a weighted sum of constructs: Σ w² (1 − r), z units. */
function errorVariance(weights: Map<string, number>, t: Table) {
  let v = 0;
  for (const [id, w] of weights) v += w * w * (1 - (t.table.get(id)!.reliability ?? t.fallbackReliability));
  return v;
}

/** Error variance of the difference between two lanes' fits; shared constructs cancel. */
function differenceVariance(a: Map<string, number>, b: Map<string, number>, t: Table) {
  const diff = new Map(a);
  for (const [id, w] of b) diff.set(id, (diff.get(id) ?? 0) - w);
  return errorVariance(diff, t);
}

export function matchLanes(profile: ProfileScores, taxonomy: TaxonomyForMatching): LaneMatch[] {
  const t = constructTable(profile, taxonomy);
  const lanes = taxonomy.families.flatMap((f) => f.lanes);
  const scored = lanes.map((lane) => {
    const { weights, unscored } = laneWeights(lane, t, taxonomy.tag_to_constructs);
    return { lane, unscored, weights, s: weights ? scoreWeights(weights, t) : null };
  });
  const fits = scored.flatMap((x) => (x.s ? [x.s.fit] : []));
  const average = fits.length ? fits.reduce((a, b) => a + b, 0) / fits.length : 0;
  const comparable = scored.filter((x) => x.s && x.weights);

  return scored.map(({ lane, unscored, weights, s }): LaneMatch => {
    if (!s || !weights) {
      return { laneId: lane.id, band: "insufficient", fit: null, se: null, vsAverage: null, drivers: [], unscoredTags: unscored, expectedPayoff: null, fitPayoff: null };
    }
    // BLUEPRINT §7 reliability rule, applied to lanes: a lane is a strong fit when it is clearly
    // above more than half of the person's other lanes, unlikely when clearly below more than
    // half. "Clearly" = the difference exceeds 1.96 × its standard error.
    let above = 0;
    let below = 0;
    for (const o of comparable) {
      if (o.lane.id === lane.id) continue;
      const d = s.fit - o.s!.fit;
      const se = Math.sqrt(differenceVariance(weights, o.weights!, t));
      if (d > Z95 * se) above++;
      else if (d < -Z95 * se) below++;
    }
    const half = (comparable.length - 1) / 2;
    const band: Band = above > half ? "strong" : below > half ? "unlikely" : "testing";
    const vs = s.fit - average;
    // Where a person like this might realistically land on the lane's payoff curve (conceptual).
    const position = normalCdf(vs);
    const expectedPayoff = payoffCurve(lane.payoff, position);
    return {
      laneId: lane.id,
      band,
      fit: s.fit,
      se: Math.sqrt(errorVariance(weights, t)),
      vsAverage: vs,
      drivers: s.drivers.slice(0, 4),
      unscoredTags: unscored,
      expectedPayoff,
      // Payoff weighs, but never fully erases, fit: the factor ranges 0.35–1.
      fitPayoff: position * (0.35 + 0.65 * expectedPayoff),
    };
  });
}

export const BAND_ORDER: Band[] = ["strong", "testing", "unlikely", "insufficient"];
export const bandLabel: Record<Band, string> = {
  strong: "Strong fit",
  testing: "Worth testing",
  unlikely: "Unlikely",
  insufficient: "Not enough data",
};

/** Sort within a band by the active toggle; ties broken by name so the order is stable. */
type Sortable = Pick<LaneMatch, "band" | "vsAverage" | "fitPayoff">;
export function sortMatches<T extends { match: Sortable; name: string }>(xs: T[], sort: "fit" | "fit-payoff"): T[] {
  const key = (m: Sortable) => (sort === "fit" ? (m.vsAverage ?? -Infinity) : (m.fitPayoff ?? -Infinity));
  return [...xs].sort((a, b) => BAND_ORDER.indexOf(a.match.band) - BAND_ORDER.indexOf(b.match.band) || key(b.match) - key(a.match) || a.name.localeCompare(b.name));
}
