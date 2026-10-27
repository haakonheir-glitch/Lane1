/**
 * Renders the generated part of taxonomy/derived/MATCHING_V2_REPORT.md (between the
 * GENERATED:START/END markers) from taxonomy/derived/matching_v2_validation.json.
 *
 *   npx tsx scripts/report-matching-v2.mts
 */
import { readFileSync, writeFileSync } from "node:fs";

type Test = { id: string; label: string; bandCounts: Record<string, number>; archetype: { top2: { archetype: string; share: number }[]; tentative: boolean; reason: string | null } | null; notes: string[]; expectFamilies: string[]; top10: { name: string; family: string; band: string; fulfilment: number; ability: number | null }[]; expectedFamilyHits: number };
const v = JSON.parse(readFileSync("taxonomy/derived/matching_v2_validation.json", "utf8")) as {
  generated: string;
  version: string;
  draws: number;
  tests: Test[];
  population: {
    n: number;
    seconds: number;
    strongFits: Record<string, number>;
    bandDistribution: Record<string, number>;
    popularityBias: { name: string; share: number }[];
    mostOftenStrong: { name: string; share: number }[];
    neverStrong: string[];
    flatNotes: number;
    tentativeArchetypes: number;
  };
  thresholdSweep: { threshold: number; mean: number; p10: number; median: number; p90: number; shareIn8to20: number }[];
};

const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
const L: string[] = [];
L.push(`Generated ${v.generated} from \`taxonomy/derived/matching_v2_validation.json\` (matching ${v.version}, ${v.draws} draws per person).`, "");
L.push("### The six test profiles", "");
L.push("| Profile | Strong / possible / unlikely | Top 10 in expected families | Archetype blend (top two) | Note |", "|---|---|---|---|---|");
for (const t of v.tests) {
  const a = t.archetype ? `${t.archetype.top2.map((x) => `${x.archetype} ${x.share}%`).join(", ")}${t.archetype.tentative ? " (tentative)" : ""}` : "—";
  L.push(`| ${t.label} | ${t.bandCounts.strong} / ${t.bandCounts.possible} / ${t.bandCounts.unlikely} | ${t.id === "flat" ? "n/a" : `${t.expectedFamilyHits} of 10`} | ${a} | ${t.notes.length ? "flat-profile note shown" : ""} |`);
}
L.push("");
for (const t of v.tests) {
  L.push(`**${t.label}**: ${t.top10.map((x, i) => `${i + 1}. ${x.name} (${x.band === "strong" ? "S" : x.band === "possible" ? "P" : "U"}, fulfilment ${x.fulfilment}, ability ${x.ability ?? "—"})`).join(" · ")}`, "");
}
const p = v.population;
L.push(`### Simulated population (${p.n} people)`, "");
L.push(`- **Strong fits per person:** mean **${p.strongFits.mean}**, median ${p.strongFits.median}, 10th–90th percentile ${p.strongFits.p10}–${p.strongFits.p90}, range ${p.strongFits.min}–${p.strongFits.max}. **${pct(p.strongFits.shareIn8to20!)}** of people get 8–20.`);
L.push(`- **Band distribution (average per person):** strong ${p.bandDistribution.strong}, possible ${p.bandDistribution.possible}, unlikely ${p.bandDistribution.unlikely}, not enough data ${p.bandDistribution.insufficient}.`);
L.push(`- **Popularity bias (strong for more than 30% of people):** ${p.popularityBias.length ? p.popularityBias.map((x) => `${x.name} ${pct(x.share)}`).join(", ") : "**none**"}.`);
L.push(`- **Strong most often:** ${p.mostOftenStrong.slice(0, 10).map((x) => `${x.name} ${pct(x.share)}`).join(", ")}.`);
L.push(`- **Never strong for anyone:** ${p.neverStrong.length ? p.neverStrong.join(", ") : "none"}.`);
L.push(`- **Few-strong-fit notes:** ${p.flatNotes} of ${p.n} people got a flat-profile note.`);
L.push(`- **Tentative archetype blends:** ${p.tentativeArchetypes} of ${p.n} (${pct(p.tentativeArchetypes / p.n)}).`);
L.push(`- **Runtime:** ${p.seconds} s for ${p.n} people (about ${Math.round((p.seconds / p.n) * 1000)} ms each).`, "");
L.push("### Strong-fit threshold sweep (P(top 10%) ≥ threshold)", "");
L.push("| Threshold | Mean strong fits | 10th pct | Median | 90th pct | Share with 8–20 |", "|---|---|---|---|---|---|");
for (const s of v.thresholdSweep) L.push(`| ${s.threshold}${s.threshold === 0.5 ? " (chosen)" : ""} | ${s.mean} | ${s.p10} | ${s.median} | ${s.p90} | ${pct(s.shareIn8to20)} |`);

const file = "taxonomy/derived/MATCHING_V2_REPORT.md";
const doc = readFileSync(file, "utf8");
const [a, rest] = doc.split("<!-- GENERATED:START -->");
const [, b] = rest!.split("<!-- GENERATED:END -->");
writeFileSync(file, `${a}<!-- GENERATED:START -->\n${L.join("\n")}\n<!-- GENERATED:END -->${b}`);
console.log(`wrote the generated section of ${file}`);
