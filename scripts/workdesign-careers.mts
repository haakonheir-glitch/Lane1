/**
 * The career side of every Work Design dimension for all career paths, from
 * taxonomy/derived/lane_onet_profiles.json. Writes taxonomy/derived/workdesign_careers.json
 * (all scores) and workdesign_careers.md (top and bottom 8 per dimension, plus element checks).
 *
 *   npx tsx scripts/workdesign-careers.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { DIMENSIONS } from "../src/lib/workdesign/model";
import { careerWorkDesign, type LaneOnetProfile } from "../src/lib/workdesign/career";

type Built = { release: Record<string, string>; lanes: Record<string, LaneOnetProfile & { occupations: { soc: string; title: string; weight: number }[] }> };
const built = JSON.parse(readFileSync("taxonomy/derived/lane_onet_profiles.json", "utf8")) as Built;
const lanes = Object.entries(built.lanes);

const scores = Object.fromEntries(lanes.map(([id, p]) => [id, careerWorkDesign(p)]));
writeFileSync("taxonomy/derived/workdesign_careers.json", JSON.stringify({ release: built.release, scores }, null, 1) + "\n");

const tag = (p: LaneOnetProfile) => (p.provenance === "estimated" ? " *(est.)*" : p.coverage_confidence !== null && p.coverage_confidence < 0.4 ? " *(low cov.)*" : "");
const row = (id: string, v: number) => `${built.lanes[id]!.name}${tag(built.lanes[id]!)} ${v.toFixed(0)}`;
const out: string[] = [];
out.push(`Career side, O*NET ${built.release.onet} (Work Values ${built.release.work_values}). 0–100 = percentile among all O*NET occupations. *(est.)* = estimated profile; *(low cov.)* = coverage confidence under 0.4.`, "");

for (const d of DIMENSIONS) {
  const vals = lanes.flatMap(([id]) => (scores[id]![d.id]!.value === null ? [] : [[id, scores[id]![d.id]!.value!] as const])).sort((a, b) => b[1] - a[1]);
  const missing = lanes.length - vals.length;
  out.push(`### ${d.name}${d.archetype ? ` (${d.archetype})` : ""}`, "");
  out.push(`Top 8: ${vals.slice(0, 8).map(([id, v]) => row(id, v)).join(" · ")}`, "");
  out.push(`Bottom 8: ${vals.slice(-8).reverse().map(([id, v]) => row(id, v)).join(" · ")}`, "");
  if (missing) out.push(`No score (under half the element weight available): ${missing} career paths.`, "");
}

const element = (file: string, el: string, scale: string, label: string) => {
  const vals = lanes.flatMap(([id, p]) => {
    const c = p.descriptors[file]?.[el]?.[scale];
    return c ? [[id, c.pct] as const] : [];
  }).sort((a, b) => b[1] - a[1]);
  out.push(`### Element check: ${label}`, "");
  out.push(`Top 8: ${vals.slice(0, 8).map(([id, v]) => row(id, v)).join(" · ")}`, "");
  out.push(`Bottom 8: ${vals.slice(-8).reverse().map(([id, v]) => row(id, v)).join(" · ")}`, "");
};
out.push("## Element checks named in the brief", "");
element("Work Context", "Freedom to Make Decisions", "CX", "Freedom to Make Decisions (Work Context)");
element("Work Context", "Time Pressure", "CX", "Time Pressure (Work Context)");
element("Work Activities", "Assisting and Caring for Others", "IM", "Assisting and Caring for Others (Work Activity, Importance)");

writeFileSync("taxonomy/derived/workdesign_careers.md", out.join("\n") + "\n");
console.log(`scored ${lanes.length} career paths on ${DIMENSIONS.length} dimensions`);
