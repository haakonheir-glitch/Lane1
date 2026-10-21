/**
 * File 05 (O*NET Work Importance Locator, 20-card forced Q-sort) and file 06 (Lane values
 * extension, 12-card 2-2-4-2-2 sort; experimental).
 * - Card score = column number (1–5).
 * - WIL value score = Σ card scores for the value × its multiplier (equalises card counts).
 * - Extension: within-person ranks only; forced sorts are ipsative and never compared between people.
 */
import type { Visibility } from "./types";

/** cardId → column value (1–5). */
export type QSort = Record<string, number>;

/** Checks that every card is placed and each column holds exactly its capacity. */
export function validateSort(sort: QSort, cardIds: string[], capacities: number[], columnValues: number[]): string | null {
  for (const id of cardIds) if (!(id in sort)) return `Card ${id} is not placed`;
  for (const id of Object.keys(sort)) if (!cardIds.includes(id)) return `Unknown card ${id}`;
  for (let c = 0; c < columnValues.length; c++) {
    const n = Object.values(sort).filter((v) => v === columnValues[c]).length;
    if (n !== capacities[c]) return `Column ${columnValues[c]} has ${n} cards, needs ${capacities[c]}`;
  }
  return null;
}

export type ValueScore = { id: string; label: string; score: number; rank: number; visibility: Visibility };

export function scoreWil(sort: QSort, valueOf: Record<string, string>, multipliers: Record<string, number>): ValueScore[] {
  const totals = new Map<string, number>();
  for (const [card, col] of Object.entries(sort)) {
    const v = valueOf[card];
    if (!v) continue;
    totals.set(v, (totals.get(v) ?? 0) + col);
  }
  const rows = Object.keys(multipliers).map((v) => ({ id: v, label: v, score: (totals.get(v) ?? 0) * multipliers[v]!, visibility: "user" as const }));
  return rank(rows);
}

export function scoreValuesExtension(sort: QSort, scaleOf: Record<string, string>): ValueScore[] {
  const rows = Object.entries(sort).map(([card, col]) => ({ id: scaleOf[card] ?? card, label: scaleOf[card] ?? card, score: col, visibility: "hidden" as const }));
  return rank(rows);
}

/** Rank by score, descending; equal scores share a rank (competition ranking: 1, 2, 2, 4). */
function rank<T extends { score: number }>(rows: T[]): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  return sorted.map((r) => ({ ...r, rank: sorted.findIndex((x) => x.score === r.score) + 1 }));
}
