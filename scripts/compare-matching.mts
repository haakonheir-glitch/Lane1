/**
 * Read-only: matching v1 against v2 for one account (brief Phase 2, step 8): the top 15 of each,
 * band counts, the v2 archetype blend, top five and best per direction. Writes nothing.
 *
 *   npx tsx --conditions=react-server scripts/compare-matching.mts LN-20261023-H2C                 local
 *   DATABASE_URL=… npx tsx --conditions=react-server scripts/compare-matching.mts LN-… --force       hosted
 */
import { matchLanes, sortMatches } from "../src/lib/matching";
import { bestByDirection, matchV2, rankV2, topFive } from "../src/lib/matching/v2";
import { personInputs } from "../src/lib/workdesign/person";
import { getLane, taxonomy } from "../src/lib/taxonomy";
import { loadAccountProfile } from "./lib-account";

const reportId = process.argv[2];
if (!reportId) throw new Error("Usage: compare-matching.mts <report ID>");
const { profile, sessions } = await loadAccountProfile(reportId);
console.log(`Matching v1 vs v2 for ${reportId} · sessions ${sessions.join(", ")}\n`);

const v1 = sortMatches(matchLanes(profile, taxonomy).map((m) => ({ match: m, name: getLane(m.laneId)!.name })));
const v1Bands = { strong: 0, testing: 0, unlikely: 0, insufficient: 0 };
for (const x of v1) v1Bands[x.match.band]++;
const v2 = matchV2({ inputs: personInputs(profile) });
const ranked = rankV2(v2.lanes);

const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n));
console.log(`Band counts   v1: strong ${v1Bands.strong} · possible ${v1Bands.testing} · unlikely ${v1Bands.unlikely} · not enough data ${v1Bands.insufficient}`);
console.log(`              v2: strong ${v2.bandCounts.strong} · possible ${v2.bandCounts.possible} · unlikely ${v2.bandCounts.unlikely} · not enough data ${v2.bandCounts.insufficient}\n`);
console.log(`${"#".padStart(2)}  ${pad("v1 (relative fit)", 44)} ${pad("v2 (fulfilment fit, 90% range · ability fit · P(top 10%))", 80)}`);
for (let i = 0; i < 15; i++) {
  const a = v1[i];
  const b = ranked[i];
  const left = a ? `${a.match.band === "strong" ? "S" : a.match.band === "testing" ? "P" : "U"} ${a.name}` : "";
  const right = b ? `${b.band[0]!.toUpperCase()} ${b.name}${b.provenance === "estimated" ? " (est.)" : ""} · ${b.fulfilmentFit.mean} (${b.fulfilmentFit.p10}–${b.fulfilmentFit.p90}) · ${b.abilityFit ? b.abilityFit.mean : "—"} · ${b.pTop}` : "";
  console.log(`${String(i + 1).padStart(2)}  ${pad(left, 44)} ${right}`);
}
const inV1 = new Set(v1.slice(0, 15).map((x) => x.match.laneId as string));
console.log(`\nOverlap of the two top 15s: ${ranked.slice(0, 15).filter((l) => inV1.has(l.laneId)).length} career paths.`);

if (v2.archetype) {
  const a = v2.archetype;
  console.log(`\nArchetype blend (v2): ${a.top2.map((x) => `${x.archetype} ${x.share}%`).join(" · ")}${a.tentative ? ` — tentative: ${a.reason}` : ""}`);
  console.log(`  full blend: ${a.blend.map((x) => `${x.archetype} ${x.share}`).join(", ")}`);
}
console.log(`\nTop five (v2): ${topFive(v2).map((t) => `${t.name} (fulfilment ${t.fulfilment}, ability ${t.ability ?? "—"})`).join("; ")}`);
console.log(`Best in each direction (v2): ${bestByDirection(v2).map((t) => `${t.directionLabel}: ${t.name}`).join("; ")}`);
for (const n of v2.notes) console.log(`Note: ${n.text}`);
const top = ranked[0];
if (top) {
  console.log(`\nWhy ${top.name} fits: ${top.drivers.map((d) => `${d.label} (+${d.contribution})`).join("; ")}`);
  console.log(`Where it rubs: ${top.frictions.map((d) => `${d.label} (${d.contribution})`).join("; ") || "nothing stands out"}`);
}
process.exit(0);
