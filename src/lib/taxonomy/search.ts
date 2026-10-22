/**
 * Job-title search (taxonomy matching rule 7). Pure, so it can be tested without a server.
 *
 * Free text ("salgssjef", "junior dev", "ventilation") resolves to a lane, and to a role when
 * known. Role titles and aliases are matched first; ESCO occupation labels only fill in behind
 * a role match of the same quality, so the curated taxonomy wins over the long tail.
 */
import type { Lane } from "./generated";

export type SearchSource = "role" | "alias" | "esco";
export type SearchEntry = { text: string; norm: string; tokens: string[]; laneId: string; roleId: string | null; source: SearchSource };
export type SearchHit = { matched: string; laneId: string; roleId: string | null; source: SearchSource };

/** Lower-case, strip accents and punctuation; Norwegian æ/ø/å fold to ae/o/a. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();
}

const entry = (text: string, laneId: string, roleId: string | null, source: SearchSource): SearchEntry => {
  const norm = normalize(text);
  return { text, norm, tokens: norm.split(" ").filter(Boolean), laneId, roleId, source };
};

export function buildSearchIndex(lanes: Pick<Lane, "id" | "roles">[], esco: [string, string, string | null][]): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const l of lanes)
    for (const r of l.roles) {
      out.push(entry(r.title, l.id, r.id, "role"));
      for (const a of r.aka) out.push(entry(a, l.id, r.id, "alias"));
    }
  for (const [label, laneId, roleId] of esco) out.push(entry(label, laneId, roleId, "esco"));
  return out.filter((e) => e.norm.length > 0);
}

/** Match quality: 4 exact, 3 starts with the query, 2 every query word starts a word, 1 contains. */
function quality(e: SearchEntry, q: string, qTokens: string[]): number {
  if (e.norm === q) return 4;
  if (e.norm.startsWith(q)) return 3;
  if (qTokens.every((t) => e.tokens.some((w) => w.startsWith(t)))) return 2;
  if (q.length >= 3 && e.norm.includes(q)) return 1;
  return 0;
}

const SOURCE_ORDER: Record<SearchSource, number> = { role: 0, alias: 1, esco: 2 };

export function searchTitles(index: SearchEntry[], query: string, limit = 8): SearchHit[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const qTokens = q.split(" ");
  const scored = index
    .map((e) => ({ e, q: quality(e, q, qTokens) }))
    .filter((x) => x.q > 0)
    // Better match first; at equal quality, curated roles before aliases before ESCO; then shorter text.
    .sort((a, b) => b.q - a.q || SOURCE_ORDER[a.e.source] - SOURCE_ORDER[b.e.source] || a.e.norm.length - b.e.norm.length || a.e.text.localeCompare(b.e.text));
  const seen = new Set<string>();
  const hits: SearchHit[] = [];
  for (const { e } of scored) {
    const key = `${e.laneId}|${e.roleId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({ matched: e.text, laneId: e.laneId, roleId: e.roleId, source: e.source });
    if (hits.length >= limit) break;
  }
  return hits;
}
