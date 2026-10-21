import type { Lane, LaneSort, PayoffType, RankedLane, Score } from "../types";

/**
 * Payoff curves map skill percentile (0–1) to relative payoff (0–1).
 * Conceptual shapes, not calibrated earnings data.
 */
export function payoffCurve(type: PayoffType, x: number): number {
  const t = Math.min(1, Math.max(0, x));
  switch (type) {
    case "linear":
      return 0.18 + 0.72 * t;
    case "convex":
      return 0.04 + 0.96 * Math.pow(t, 2.4);
    case "winner-take-all":
      return 0.02 + 0.98 * Math.pow(t, 12);
  }
}

export const payoffLabel: Record<PayoffType, string> = {
  linear: "Linear",
  convex: "Convex",
  "winner-take-all": "Winner-take-all",
};

export const payoffDescription: Record<PayoffType, string> = {
  linear: "Pay rises steadily with skill. A solid practitioner earns a solid living.",
  convex: "Pay accelerates with skill. The top third earns disproportionately more.",
  "winner-take-all":
    "A small top tier captures most of the reward. Below it, payoff is close to flat.",
};

/** Ties are declared when adjacent scores are closer than this (in points). */
const TIE_THRESHOLD = 2.5;

function fitPayoffScore(lane: Lane): { score: Score; expected: number } {
  const expected = payoffCurve(lane.payoff, lane.payoffPosition);
  // Payoff weighs, but never fully erases, fit: the factor ranges 0.35–1.
  const factor = 0.35 + 0.65 * expected;
  const lo = 0.35 + 0.65 * payoffCurve(lane.payoff, lane.payoffPositionCi[0]);
  const hi = 0.35 + 0.65 * payoffCurve(lane.payoff, lane.payoffPositionCi[1]);
  const f = lane.relativeFit;
  return {
    expected,
    score: {
      value: round(f.value * factor),
      ci: [round(f.ci[0] * lo), round(f.ci[1] * hi)],
    },
  };
}

export function rankLanes(lanes: Lane[], sort: LaneSort): RankedLane[] {
  const scored = lanes.map((lane) => {
    const fp = fitPayoffScore(lane);
    return {
      lane,
      expected: fp.expected,
      sortScore: sort === "fit" ? lane.relativeFit : fp.score,
    };
  });
  scored.sort((a, b) => b.sortScore.value - a.sortScore.value);

  // A lane ties with the lane holding the current rank only if it is within the
  // threshold of that anchor, so ties never chain down the list.
  const ranked: RankedLane[] = [];
  let anchor: RankedLane | undefined;
  scored.forEach((s, i) => {
    const tied = anchor !== undefined && anchor.sortScore.value - s.sortScore.value < TIE_THRESHOLD;
    const rank = tied && anchor ? anchor.rank : i + 1;
    if (tied && anchor) anchor.tied = true;
    const lane: RankedLane = { ...s.lane, rank, tied, expectedPayoff: s.expected, sortScore: s.sortScore };
    if (!tied) anchor = lane;
    ranked.push(lane);
  });
  return ranked;
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

/** Mean of a numeric list, or 0 for an empty list. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
