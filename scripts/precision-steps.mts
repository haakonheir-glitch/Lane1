/**
 * Precision pass step 9: the cumulative effect of each step, from v2-0.4 to v2-0.5, for the six
 * test profiles (default) or one account. Per step: the top 15, band counts and the archetype
 * blend. Plus the inputs table (anchored against normed) and, for an account, the interest-only
 * ranking against high-point-code congruence.
 *
 *   npx tsx --conditions=react-server scripts/precision-steps.mts                 → taxonomy/derived/PRECISION_STEPS.md
 *   npx tsx --conditions=react-server scripts/precision-steps.mts --account LN-20261023-H2C --force
 *   add --final for only the final config: the top 15 and band counts
 *                                                                                  → .data/precision-steps-<id>.md (not committed)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { LANE_PROFILES_V2, matchAllV2, rankV2, type MatchResultV2, type V2Config } from "../src/lib/matching/v2";
import { synthetic, TEST_PROFILES } from "../src/lib/matching/v2/synthetic";
import type { PersonProfile } from "../src/lib/matching/v2/types";
import { personInputs, type Estimate } from "../src/lib/workdesign/person";
import type { ProfileScores } from "../src/lib/scoring/profile";
import { getLane } from "../src/lib/taxonomy";
import { STEPS, V4, V5, code3, cIndex, iachan, offsetsForConfig, ranks, spearman } from "./lib-precision";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const account = arg("account");
const r1 = (x: number) => Math.round(x * 10) / 10;
const B = { strong: "S", possible: "P", unlikely: "U", insufficient: "–" } as const;

type Subject = { id: string; label: string; person: (cfg: V2Config) => PersonProfile; profile?: ProfileScores };

const subjects: Subject[] = [];
if (account) {
  const { loadAccountProfile } = await import("./lib-account");
  const { profile, sessions } = await loadAccountProfile(account);
  subjects.push({ id: account, label: `Account ${account} (sessions ${sessions.join(", ")})`, person: (cfg) => ({ inputs: personInputs(profile, cfg.inputs) }), profile });
} else {
  for (const [id, t] of Object.entries(TEST_PROFILES)) subjects.push({ id, label: t.label, person: (cfg) => synthetic(t.spec, cfg.inputs, "percentile") });
}

const L: string[] = [];
L.push(account ? `# Precision pass, step by step: ${account}` : "# Precision pass, step by step: the six test profiles", "");
L.push(
  `Generated ${new Date().toISOString().slice(0, 10)}.${account ? "" : " The test profiles are read as population percentiles (synthetic.ts, specAs \"percentile\"): the same people under each step's rules."} Each step is added on top of the previous one, starting from v2-0.4: ${STEPS.map((s) => s.label).join(" → ")}. ${V5.draws} draws each. Bands in the lists: S strong, P possible, U unlikely. Fit is the expected fulfilment fit (50 = the person's average career path).`,
  "",
);

// --final: only the final config (v2-0.5 as configured now): the top 15 and the band counts.
if (process.argv.includes("--final")) {
  const F: string[] = [`# Final config (${V5.version}, strong fit at P(top 10%) ≥ ${V5.bands.strong} under both weightings)`, ""];
  for (const s of subjects) {
    const r = matchAllV2(s.person(V5), LANE_PROFILES_V2, { config: V5, offsets: offsetsForConfig(V5) });
    const a = r.archetype ? `${r.archetype.top2.map((x) => `${x.archetype} ${x.share}%`).join(", ")}${r.archetype.tentative ? " (tentative)" : ""}` : "—";
    F.push(`## ${s.label}`, "", `**Bands:** ${r.bandCounts.strong} strong · ${r.bandCounts.possible} possible · ${r.bandCounts.unlikely} unlikely. **Archetype:** ${a}`, "", "| # | Career path | Band | Fulfilment fit (p10–p90) | Note |", "|---|---|---|---|---|");
    rankV2(r.lanes)
      .slice(0, 15)
      .forEach((l, i) => F.push(`| ${i + 1} | ${l.name} | ${l.band}${l.cappedFrom ? " (capped)" : ""} | ${r1(l.fulfilmentFit.mean)} (${r1(l.fulfilmentFit.p10)}–${r1(l.fulfilmentFit.p90)}) | ${l.capNote ?? ""} |`));
    F.push("");
  }
  const text = F.join("\n") + "\n";
  console.log(text);
  if (account) {
    mkdirSync(".data", { recursive: true });
    writeFileSync(`.data/precision-final-${account}.md`, text);
    console.error(`wrote .data/precision-final-${account}.md (not committed: .data is git-ignored)`);
  }
  process.exit(0);
}

for (const s of subjects) {
  L.push(`## ${s.label}`, "");
  const results: { step: (typeof STEPS)[number]; r: MatchResultV2 }[] = STEPS.map((step) => ({ step, r: matchAllV2(s.person(step.cfg), LANE_PROFILES_V2, { config: step.cfg, offsets: offsetsForConfig(step.cfg) }) }));

  L.push("| Step | Strong / possible / unlikely | Archetype blend (top two) | Environment dimensions capped |", "|---|---|---|---|");
  for (const { step, r } of results) {
    const a = r.archetype ? `${r.archetype.top2.map((x) => `${x.archetype} ${x.share}%`).join(", ")}${r.archetype.tentative ? " (tentative)" : ""}` : "—";
    const capped = r.envGuard.filter((g) => g.scale < 1).map((g) => `${g.dimension} ${Math.round(g.maxShareBefore * 100)}→${Math.round(g.maxShareAfter * 100)}%`).join(", ");
    L.push(`| ${step.label} | ${r.bandCounts.strong} / ${r.bandCounts.possible} / ${r.bandCounts.unlikely} | ${a} | ${step.cfg.envCap === null ? "no cap" : capped || "none over 15%"} |`);
  }
  L.push("");

  L.push("**Top 15 at each step**", "");
  L.push(`| # | ${results.map(({ step }) => step.label).join(" | ")} |`, `|---|${results.map(() => "---").join("|")}|`);
  const tops = results.map(({ r }) => rankV2(r.lanes).slice(0, 15));
  for (let i = 0; i < 15; i++) L.push(`| ${i + 1} | ${tops.map((t) => (t[i] ? `${t[i]!.name} (${B[t[i]!.band]}, ${r1(t[i]!.fulfilmentFit.mean)})` : "")).join(" | ")} |`);
  const first = new Set(tops[0]!.map((l) => l.laneId));
  const lastTop = tops.at(-1)!;
  const kept = lastTop.filter((l) => first.has(l.laneId)).length;
  L.push("", `Of v2-0.4's top 15, ${kept} ${kept === 1 ? "is" : "are"} still in v2-0.5's top 15.`, "");

  // The inputs, anchored (v2-0.4) against normed / order statistics (v2-0.5).
  const a = s.person(V4).inputs;
  const b = s.person(V5).inputs;
  const keys = (Object.keys(b) as (keyof typeof b)[]).filter((k) => /^(interests|values)\./.test(k) || /^neo\.[A-Z][a-z]/.test(k));
  const cell = (e: Estimate | undefined) => (e ? `${r1(e.value)} ± ${r1(1.645 * e.se)}` : "—");
  L.push(`**${account ? "Your" : "The"} inputs, anchored (v2-0.4) and as v2-0.5 reads them** (0–100, ± the 90% half-range)`, "");
  L.push("| Input | v2-0.4 | how | v2-0.5 | how |", "|---|---|---|---|---|");
  for (const k of keys) L.push(`| ${k} | ${cell(a[k])} | ${a[k]?.provenance ?? ""} | ${cell(b[k])} | ${b[k]?.provenance ?? ""} |`);
  L.push("");

  if (account) {
    // Interest-only ranking against high-point-code congruence (step 7b) for the account.
    const r = results.at(-1)!.r;
    const interests = ["R", "I", "A", "S", "E", "C"].map((k) => b[`interests.${k}` as "interests.R"]!.value);
    const code = code3(interests);
    const lanes = r.lanes.map((l) => ({ id: l.laneId, ours: l.components.interests ?? 0, code: code3(LANE_PROFILES_V2[l.laneId]!.interests) }));
    const C = lanes.map((l) => cIndex(code, l.code));
    const M = lanes.map((l) => iachan(code, l.code));
    const ro = ranks(lanes.map((l) => l.ours));
    const rc = ranks(C);
    const div = lanes.map((l, i) => ({ name: getLane(l.id)?.name ?? l.id, code: l.code, ours: ro[i]!, c: rc[i]! })).filter((x) => Math.abs(x.ours - x.c) > 50);
    L.push(`**Interest-only ranking against congruence** (your code ${code}): Spearman ρ with the C index ${spearman(lanes.map((l) => l.ours), C).toFixed(2)}, with Iachan's M ${spearman(lanes.map((l) => l.ours), M).toFixed(2)}. ${div.length} career paths are more than 50 ranks apart: ${div.slice(0, 15).map((d) => `${d.name} [${d.code}] ours ${d.ours}, C ${d.c}`).join(" · ")}`, "");
  }
}

const text = L.join("\n") + "\n";
if (account) {
  mkdirSync(".data", { recursive: true });
  const file = `.data/precision-steps-${account}.md`;
  writeFileSync(file, text);
  console.log(text);
  console.error(`wrote ${file} (not committed: .data is git-ignored)`);
} else {
  writeFileSync("taxonomy/derived/PRECISION_STEPS.md", text);
  console.log("wrote taxonomy/derived/PRECISION_STEPS.md");
}
