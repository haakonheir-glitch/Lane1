import type { Confidence, LaneGroup, Score } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parses an ISO date (YYYY-MM-DD) without timezone drift. */
function parts(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y: y ?? 0, m: m ?? 1, d: d ?? 1 };
}

/** 2026-10-21 → "21 Oct 2026" */
export function formatDate(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** 2026-10-21 → "21 Oct" */
export function formatDay(iso: string): string {
  const { m, d } = parts(iso);
  return `${d} ${MONTHS[m - 1]}`;
}

/** 2026-10-21 → "2026.10.21" (report style) */
export function formatIsoDot(iso: string): string {
  return iso.slice(0, 10).replaceAll("-", ".");
}

export function addDays(iso: string, days: number): string {
  const { y, m, d } = parts(iso);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  const pa = parts(a);
  const pb = parts(b);
  return Math.round(
    (Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000,
  );
}

/** Half-width of an interval, rounded: [70, 86] → 8 */
export function ciHalf(score: Score): number {
  return Math.round((score.ci[1] - score.ci[0]) / 2);
}

export function fmtScore(n: number, digits = 0): string {
  return n.toFixed(digits);
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function fmtSigned(n: number, digits = 0): string {
  const s = Math.abs(n).toFixed(digits);
  return n > 0 ? `+${s}` : n < 0 ? `−${s}` : s;
}

export function fmtPercentile(p: number): string {
  return `P${Math.round(p)}`;
}

export function fmtTimer(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`;
}

export const confidenceLabel: Record<Confidence, string> = { high: "High", med: "Medium", low: "Low" };

export const groupLabel: Record<LaneGroup, string> = {
  corporate: "Corporate",
  independent: "Independent",
  performance: "Performance",
  craft: "Craft",
};
