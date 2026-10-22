/**
 * Payoff curves map a skill percentile (0–1) to relative payoff (0–1). They are conceptual
 * shapes for the five taxonomy curves, not calibrated earnings data.
 */
import type { PayoffId } from "../taxonomy/generated";

export function payoffCurve(type: PayoffId, x: number): number {
  const t = Math.min(1, Math.max(0, x));
  switch (type) {
    case "linear":
      return 0.18 + 0.72 * t;
    case "linear_high_floor":
      return 0.42 + 0.43 * t;
    case "convex":
      return 0.04 + 0.96 * Math.pow(t, 2.4);
    case "steep":
      return 0.03 + 0.97 * Math.pow(t, 5);
    case "winner_take_all":
      return 0.02 + 0.98 * Math.pow(t, 12);
  }
}

export const payoffLabel: Record<PayoffId, string> = {
  linear: "Linear",
  linear_high_floor: "High floor",
  convex: "Convex",
  steep: "Steep",
  winner_take_all: "Winner-take-all",
};

/** Shown on every winner-take-all lane, in the map row and the detail panel (taxonomy rule 4). */
export const WINNER_TAKE_ALL_NOTE =
  "In this lane a small group earns most of the income; the typical person earns little or nothing from it.";
