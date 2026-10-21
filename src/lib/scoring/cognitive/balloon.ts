/**
 * balloon (BART): adjusted average pumps = mean pumps on balloons that did not burst.
 * Loss reactivity = mean pumps on balloons right after a burst − right after a cash-out
 * (negative = more cautious after a loss).
 */
export type BalloonResult = { pumps: number; burst: boolean };

export function scoreBalloon(results: BalloonResult[]) {
  const kept = results.filter((r) => !r.burst);
  const adjusted = kept.length ? kept.reduce((s, r) => s + r.pumps, 0) / kept.length : null;
  const afterBurst: number[] = [];
  const afterCash: number[] = [];
  for (let i = 1; i < results.length; i++) (results[i - 1]!.burst ? afterBurst : afterCash).push(results[i]!.pumps);
  const m = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const ab = m(afterBurst);
  const ac = m(afterCash);
  return {
    adjustedPumps: adjusted,
    bursts: results.length - kept.length,
    lossReactivity: ab !== null && ac !== null ? ab - ac : null,
    points: kept.reduce((s, r) => s + r.pumps, 0),
  };
}
