/**
 * Matching v2 validation (brief Phase 2, step 8): the six synthetic test profiles and a simulated
 * population. Writes taxonomy/derived/matching_v2_validation.json and prints a summary.
 *
 *   npx tsx --conditions=react-server scripts/validate-matching-v2.mts [--n 1000] [--draws 500]
 *
 * For the population it also sweeps the strong-fit threshold, so the band thresholds in
 * src/lib/matching/v2/config.ts can be tuned to "a typical profile gets about 8–20 strong fits".
 */
import { writeFileSync } from "node:fs";
import { matchV2, rankV2, V2_CONFIG, type MatchResultV2 } from "../src/lib/matching/v2";
import { TEST_PROFILES, population, synthetic } from "../src/lib/matching/v2/synthetic";
import { getLane } from "../src/lib/taxonomy";

const arg = (name: string, d: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : d;
};
const N = arg("n", 1000);
const DRAWS = arg("draws", V2_CONFIG.draws);
const q = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.round(p * (xs.length - 1))]!;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

// 1. The six test profiles.
const tests = Object.entries(TEST_PROFILES).map(([id, t]) => {
  const r = matchV2(synthetic(t.spec), { draws: DRAWS });
  const top10 = rankV2(r.lanes).slice(0, 10);
  const hits = top10.filter((l) => t.expectFamilies.includes(getLane(l.laneId)!.family)).length;
  return {
    id,
    label: t.label,
    bandCounts: r.bandCounts,
    archetype: r.archetype && { top2: r.archetype.top2, tentative: r.archetype.tentative, reason: r.archetype.reason },
    notes: r.notes.map((n) => n.text),
    expectFamilies: t.expectFamilies,
    top10: top10.map((l) => ({ id: l.laneId, name: l.name, family: getLane(l.laneId)!.family, band: l.band, fulfilment: l.fulfilmentFit.mean, ability: l.abilityFit?.mean ?? null })),
    expectedFamilyHits: hits,
  };
});

// 2. The simulated population.
const people = population(N, 20261027);
const pTops: Float64Array[] = [];
const pBottoms: Float64Array[] = [];
const results: MatchResultV2[] = [];
let ids: string[] = [];
const t0 = Date.now();
people.forEach((p, i) => {
  const r = matchV2(p, { draws: DRAWS });
  if (!ids.length) ids = r.lanes.map((l) => l.laneId);
  pTops.push(Float64Array.from(r.lanes.map((l) => l.pTop)));
  pBottoms.push(Float64Array.from(r.lanes.map((l) => l.pBottom)));
  results.push(r);
  if ((i + 1) % 100 === 0) console.error(`${i + 1}/${N} (${Math.round((Date.now() - t0) / 1000)}s)`);
});

const strongCounts = results.map((r) => r.bandCounts.strong);
const bandTotals = { strong: 0, possible: 0, unlikely: 0, insufficient: 0 };
for (const r of results) for (const [k, v] of Object.entries(r.bandCounts)) bandTotals[k as keyof typeof bandTotals] += v / N;
const strongShare = ids.map((id, j) => ({ id, name: getLane(id)!.name, share: results.filter((r) => r.lanes[j]!.band === "strong").length / N }));
const popular = strongShare.filter((x) => x.share > 0.3).sort((a, b) => b.share - a.share);
const neverStrong = strongShare.filter((x) => x.share === 0).map((x) => x.name);

// 3. Threshold sweep: strong fits per person at each P(top 10%) threshold.
const sweep = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((t) => {
  const counts = pTops.map((pt) => pt.filter((x) => x >= t).length);
  return { threshold: t, mean: Math.round(mean(counts) * 10) / 10, p10: q(counts, 0.1), median: q(counts, 0.5), p90: q(counts, 0.9), shareIn8to20: Math.round((counts.filter((c) => c >= 8 && c <= 20).length / N) * 1000) / 1000 };
});

const out = {
  generated: new Date().toISOString().slice(0, 10),
  version: V2_CONFIG.version,
  draws: DRAWS,
  config: V2_CONFIG,
  tests,
  population: {
    n: N,
    seconds: Math.round((Date.now() - t0) / 1000),
    strongFits: { mean: Math.round(mean(strongCounts) * 10) / 10, p10: q(strongCounts, 0.1), median: q(strongCounts, 0.5), p90: q(strongCounts, 0.9), min: Math.min(...strongCounts), max: Math.max(...strongCounts), shareIn8to20: Math.round((strongCounts.filter((c) => c >= 8 && c <= 20).length / N) * 1000) / 1000 },
    bandDistribution: Object.fromEntries(Object.entries(bandTotals).map(([k, v]) => [k, Math.round(v * 10) / 10])),
    popularityBias: popular,
    mostOftenStrong: [...strongShare].sort((a, b) => b.share - a.share).slice(0, 15),
    neverStrong,
    flatNotes: results.filter((r) => r.notes.some((n) => n.code === "flat_profile")).length,
    tentativeArchetypes: results.filter((r) => r.archetype?.tentative).length,
  },
  thresholdSweep: sweep,
};
writeFileSync("taxonomy/derived/matching_v2_validation.json", JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify({ tests: tests.map((t) => ({ id: t.id, strong: t.bandCounts.strong, hits: t.expectedFamilyHits })), population: { ...out.population, mostOftenStrong: undefined, neverStrong: out.population.neverStrong.length }, thresholdSweep: sweep }, null, 1));
