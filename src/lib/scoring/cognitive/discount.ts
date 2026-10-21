/**
 * delay_discount: area under the discounting curve (0–1). Points are (delay / max delay,
 * indifference / later amount), with (0, 1) prepended; trapezoid rule. Higher = more patient.
 */
export function discountAuc(points: { delayDays: number; indifference: number }[], laterAmount: number): number | null {
  if (points.length === 0) return null;
  const maxDelay = Math.max(...points.map((p) => p.delayDays));
  const pts = [{ x: 0, y: 1 }, ...[...points].sort((a, b) => a.delayDays - b.delayDays).map((p) => ({ x: p.delayDays / maxDelay, y: Math.min(1, Math.max(0, p.indifference / laterAmount)) }))];
  let auc = 0;
  for (let i = 1; i < pts.length; i++) auc += ((pts[i]!.x - pts[i - 1]!.x) * (pts[i]!.y + pts[i - 1]!.y)) / 2;
  return auc;
}
