/**
 * Precision pass validation (step 7). Each part writes taxonomy/derived/precision/<part>.json;
 * `report` renders taxonomy/derived/PRECISION_REPORT.md from them.
 *
 *   npx tsx --conditions=react-server scripts/validate-precision.mts roundtrip --config v2-0.5
 *   npx tsx --conditions=react-server scripts/validate-precision.mts congruence
 *   npx tsx --conditions=react-server scripts/validate-precision.mts population --config v2-0.5 [--from 0 --to 1000]
 *   npx tsx --conditions=react-server scripts/validate-precision.mts satisfaction [--force]
 *   npx tsx --conditions=react-server scripts/validate-precision.mts report
 *
 * (a) roundtrip: each career path's synthetic typical incumbent (scripts/lib-precision.ts), with
 *     measurement error added, matched against all 205: does the career come back in its own top 10%?
 * (b) congruence: the interest-only ranking against O*NET high-point-code congruence (C index,
 *     Iachan's M) for the six test profiles (the account: scripts/precision-steps.mts --account).
 * (c) literature: the span and speed norms in the difficulty table against published adult norms.
 * (d) population: 1,000 simulated people, strong fits, popularity bias, strong-fit survival.
 * Satisfaction: the share of people whose current job's band agrees with their satisfaction.
 *
 * Every synthetic person here is specified as population percentiles (synthetic.ts, specAs
 * "percentile"), so each config reads the same people through its own rules.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { LANE_PROFILES_V2, V2_CONFIGS, matchAllV2, type MatchResultV2, type V2Config } from "../src/lib/matching/v2";
import { synthetic, population, TEST_PROFILES } from "../src/lib/matching/v2/synthetic";
import type { PersonProfile } from "../src/lib/matching/v2/types";
import { getLane } from "../src/lib/taxonomy";
import { NEO_TABLE_A1, ONET_IP, OPENNESS_WITH_O6, PSYCHOMETRICS, opennessWithoutO6 } from "../src/lib/scoring/psychometrics";
import { code3, cIndex, iachan, incumbent, normals, offsetsForConfig, ranks, spearman, V5, WORK_STYLE_MAP } from "./lib-precision";

const DIR = "taxonomy/derived/precision";
mkdirSync(DIR, { recursive: true });
const part = process.argv[2];
const arg = (name: string, d?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1]! : d;
};
const cfgArg = () => {
  const v = arg("config", "v2-0.5")!;
  const c = V2_CONFIGS[v];
  if (!c) throw new Error(`Unknown config ${v}`);
  return c;
};
const ids = Object.keys(LANE_PROFILES_V2);
const nameOf = (id: string) => getLane(id)?.name ?? id;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const q = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.round(p * (xs.length - 1))]!;
const r1 = (x: number) => Math.round(x * 10) / 10;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const save = (name: string, data: unknown) => writeFileSync(`${DIR}/${name}.json`, JSON.stringify(data, null, 1) + "\n");
const match = (p: PersonProfile, cfg: V2Config, draws = cfg.draws) => matchAllV2(p, LANE_PROFILES_V2, { config: cfg, draws, offsets: offsetsForConfig(cfg) });

/** A career's rank (1 = best) in a result, by expected fulfilment fit. */
const rankOf = (r: MatchResultV2, id: string) => {
  const sorted = r.lanes.filter((l) => Number.isFinite(l.fulfilmentFit.mean)).sort((a, b) => b.fulfilmentFit.mean - a.fulfilmentFit.mean);
  return sorted.findIndex((l) => l.laneId === id) + 1;
};

/** Measurement error: every input redrawn once from its own standard error. */
function withError(p: PersonProfile, seed: number): PersonProfile {
  const z = normals(seed);
  return { inputs: Object.fromEntries(Object.entries(p.inputs).map(([k, e]) => [k, { ...e!, value: Math.min(100, Math.max(0, e!.value + e!.se * z())) }])) as PersonProfile["inputs"] };
}

if (part === "roundtrip") {
  const cfg = cfgArg();
  const REPS = Number(arg("reps", "3"));
  const DRAWS = Number(arg("draws", "100"));
  const top = Math.ceil(0.1 * ids.length);
  const t0 = Date.now();
  const rows = ids.map((id, i) => {
    const person = synthetic(incumbent(id), cfg.inputs, "percentile");
    const clean = match(person, cfg, DRAWS);
    const noisy = Array.from({ length: REPS }, (_, k) => rankOf(match(withError(person, 7919 * (i + 1) + k), cfg, DRAWS), id));
    if ((i + 1) % 25 === 0) console.error(`${cfg.version} ${i + 1}/${ids.length} (${Math.round((Date.now() - t0) / 1000)}s)`);
    return { id, name: nameOf(id), provenance: LANE_PROFILES_V2[id]!.provenance, clean: rankOf(clean, id), cleanBand: clean.lanes.find((l) => l.laneId === id)!.band, noisy };
  });
  const allNoisy = rows.flatMap((r) => r.noisy);
  save(`roundtrip-${cfg.version}`, {
    config: cfg.version,
    draws: DRAWS,
    reps: REPS,
    topCut: top,
    seconds: Math.round((Date.now() - t0) / 1000),
    clean: { inTop10: r3(rows.filter((r) => r.clean <= top).length / rows.length), median: q(rows.map((r) => r.clean), 0.5), strong: r3(rows.filter((r) => r.cleanBand === "strong").length / rows.length) },
    noisy: { inTop10: r3(allNoisy.filter((x) => x <= top).length / allNoisy.length), median: q(allNoisy, 0.5), p90: q(allNoisy, 0.9) },
    // Can't recover itself: outside its own top 10% without error, or in most noisy replicates.
    cannotRecover: rows.filter((r) => r.clean > top || r.noisy.filter((x) => x > top).length > REPS / 2).map((r) => ({ id: r.id, name: r.name, provenance: r.provenance, clean: r.clean, noisy: r.noisy })).sort((a, b) => b.clean - a.clean),
    rows,
  });
} else if (part === "congruence") {
  const cfg = V5;
  const careers = ids.map((id) => ({ id, code: code3(LANE_PROFILES_V2[id]!.interests) }));
  const profiles = Object.entries(TEST_PROFILES).map(([pid, t]) => {
    const person = synthetic(t.spec, cfg.inputs, "percentile");
    const interests = ["R", "I", "A", "S", "E", "C"].map((k) => person.inputs[`interests.${k}` as "interests.R"]!.value);
    const code = code3(interests);
    const r = match(person, cfg, 50);
    const byId = new Map(r.lanes.map((l) => [l.laneId, l.components.interests ?? 0]));
    const ours = careers.map((c) => byId.get(c.id)!);
    const C = careers.map((c) => cIndex(code, c.code));
    const M = careers.map((c) => iachan(code, c.code));
    const rOurs = ranks(ours);
    const rC = ranks(C);
    const divergent = careers
      .map((c, i) => ({ id: c.id, name: nameOf(c.id), careerCode: c.code, ours: rOurs[i]!, cIndexRank: rC[i]!, c: C[i]!, gap: rOurs[i]! - rC[i]! }))
      .filter((x) => Math.abs(x.gap) > 50)
      .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
    return { id: pid, label: t.label, code, rhoC: r3(spearman(ours, C)), rhoM: r3(spearman(ours, M)), divergent, interests: interests.map(r1) };
  });
  save("congruence", { config: cfg.version, profiles });
} else if (part === "population") {
  const cfg = cfgArg();
  const N = Number(arg("n", "1000"));
  const from = Number(arg("from", "0"));
  const to = Number(arg("to", String(N)));
  const people = population(N, 20261027, cfg.inputs, "percentile").slice(from, to);
  const t0 = Date.now();
  const out = people.map((p, i) => {
    const r = match(p, cfg);
    if ((i + 1) % 50 === 0) console.error(`${cfg.version} ${from + i + 1}/${to} (${Math.round((Date.now() - t0) / 1000)}s)`);
    return {
      bands: r.lanes.map((l) => l.band[0]).join(""),
      strong: r.bandCounts.strong,
      tentative: !!r.archetype?.tentative,
      flatNote: r.notes.some((n) => n.code === "flat_profile"),
      envMaxBefore: r.envGuard.length ? Math.max(...r.envGuard.map((g) => g.maxShareBefore)) : null,
      envMaxAfter: r.envGuard.length ? Math.max(...r.envGuard.map((g) => g.maxShareAfter)) : null,
      envShrunk: r.envGuard.filter((g) => g.scale < 1).map((g) => g.dimension),
    };
  });
  save(`population-${cfg.version}-${from}-${to}`, { config: cfg.version, n: N, from, to, lanes: ids, seconds: Math.round((Date.now() - t0) / 1000), people: out });
} else if (part === "satisfaction") {
  if (process.env.DATABASE_URL && !process.argv.includes("--force")) {
    console.error("DATABASE_URL is set. Re-run with --force to read a hosted database (read-only).");
    process.exit(1);
  }
  const { getDb, schema } = await import("../src/lib/db");
  const { profileOf } = await import("./lib-account");
  const { personInputs } = await import("../src/lib/workdesign/person");
  const db = await getDb();
  const cfg = V5;
  const rows = (await db.select().from(schema.profiles)).filter((p) => p.currentLaneId && p.currentSatisfaction);
  const people = [];
  for (const r of rows) {
    const { profile } = await profileOf(r.userId);
    if (!profile.interests) continue;
    const m = match({ inputs: personInputs(profile, cfg.inputs) }, cfg).lanes.find((l) => l.laneId === r.currentLaneId);
    if (!m) continue;
    const s = r.currentSatisfaction!;
    const agree = (m.band === "strong" && s >= 5) || (m.band === "unlikely" && s <= 3) || (m.band === "possible" && s >= 3 && s <= 5);
    const contradict = (m.band === "strong" && s <= 2) || (m.band === "unlikely" && s >= 6);
    people.push({ band: m.band, satisfaction: s, agree, contradict });
  }
  save("satisfaction", {
    database: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : "local dev database",
    config: cfg.version,
    answered: people.length,
    agree: people.length ? r3(people.filter((p) => p.agree).length / people.length) : null,
    contradict: people.length ? r3(people.filter((p) => p.contradict).length / people.length) : null,
  });
} else if (part === "report") {
  report();
} else {
  console.error("Part: roundtrip | congruence | population | satisfaction | report");
  process.exit(1);
}

/* ------------------------------------------------------------------ report ---- */

type RT = { config: string; draws: number; reps: number; topCut: number; clean: { inTop10: number; median: number; strong: number }; noisy: { inTop10: number; median: number; p90: number }; cannotRecover: { id: string; name: string; provenance: string; clean: number; noisy: number[] }[] };
type Pop = { config: string; n: number; lanes: string[]; people: { bands: string; strong: number; tentative: boolean; flatNote: boolean; envMaxBefore: number | null; envMaxAfter: number | null; envShrunk: string[] }[] };

function loadPop(version: string): Pop | null {
  const files = readdirSync(DIR).filter((f) => f.startsWith(`population-${version}-`)).sort((a, b) => Number(a.split("-").at(-2)) - Number(b.split("-").at(-2)));
  if (!files.length) return null;
  const parts = files.map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, "utf8")) as Pop & { from: number; to: number });
  return { config: version, n: parts[0]!.n, lanes: parts[0]!.lanes, people: parts.flatMap((p) => p.people) };
}

function report() {
  const pct = (x: number) => `${r1(x * 100)}%`;
  const L: string[] = [];
  const read = <T,>(f: string): T | null => (existsSync(`${DIR}/${f}.json`) ? (JSON.parse(readFileSync(`${DIR}/${f}.json`, "utf8")) as T) : null);

  L.push(...normsSection(), "");
  L.push("## (a) Round-trip recovery", "");
  L.push(
    "Each career path's synthetic typical incumbent is matched against all 205. Interests come from O*NET OI, work values from EX, reasoning areas from the career's ability demands, and personality from O*NET Work Styles. The mapping below is an approximation: Work Styles rate how important a style is for the job, not the incumbents' traits. The incumbent goes in once as built and three times with measurement error added (every input redrawn once from its own standard error). Chance of landing in one's own top 10% is 10%.",
    "",
  );
  L.push("| Config | Own top 10%, as built | Median rank, as built | Own top 10%, with error | Median rank, with error | 90th percentile rank, with error | Strong fit for itself | Can't recover itself |", "|---|---|---|---|---|---|---|---|");
  const rts = ["v2-0.3", "v2-0.4", "v2-0.5"].map((v) => read<RT>(`roundtrip-${v}`)).filter((x): x is RT => !!x);
  for (const r of rts) L.push(`| ${r.config} | ${pct(r.clean.inTop10)} | ${r.clean.median} | ${pct(r.noisy.inTop10)} | ${r.noisy.median} | ${r.noisy.p90} | ${pct(r.clean.strong)} | ${r.cannotRecover.length} |`);
  L.push("");
  const last = rts.at(-1);
  if (last) {
    L.push(`**Career paths that can't recover themselves under ${last.config}** (outside their own top ${last.topCut} as built, or in most replicates with error). Ranks are shown as built, then with error:`, "");
    L.push(last.cannotRecover.map((c) => `${c.name}${c.provenance === "estimated" ? " (estimated)" : ""}: ${c.clean}, ${c.noisy.join("/")}`).join(" · ") || "none", "");
  }
  L.push("Work Styles → IPIP-NEO facets used for the incumbents: " + WORK_STYLE_MAP.map((m) => `${m.facet} ← ${m.reverse ? "reverse of " : ""}${m.style}`).join("; ") + ". Domains are the mean of their mapped facets.", "");

  L.push("## (b) Interest-only ranking against high-point-code congruence", "");
  const cg = read<{ config: string; profiles: { id: string; label: string; code: string; rhoC: number; rhoM: number; divergent: { name: string; careerCode: string; ours: number; cIndexRank: number; c: number; gap: number }[] }[] }>("congruence");
  if (cg) {
    L.push(
      `Under ${cg.config}, each career path is ranked by the interests component alone: the regularised correlation of the person's six interests with the career's O*NET OI profile. That ranking is compared with the ranking by Brown & Gore's (1994) C index and by Iachan's (1984) M, both computed on three-letter high-point codes. The codes compress six scores into three letters, so many career paths tie (ties take the average rank), and some disagreement is expected. The table lists every career path whose two ranks differ by more than 50.`,
      "",
    );
    L.push("| Profile | Code | Spearman ρ with the C-index ranking | ρ with the M-index ranking | Career paths more than 50 ranks apart |", "|---|---|---|---|---|");
    for (const p of cg.profiles) L.push(`| ${p.label} | ${p.code} | ${p.rhoC} | ${p.rhoM} | ${p.divergent.length} |`);
    L.push("");
    for (const p of cg.profiles)
      if (p.divergent.length)
        L.push(`**${p.label}** (${p.code}): ${p.divergent.slice(0, 12).map((d) => `${d.name} [${d.careerCode}] ours ${d.ours}, C ${d.cIndexRank}`).join(" · ")}${p.divergent.length > 12 ? ` · and ${p.divergent.length - 12} more` : ""}`, "");
    L.push("The account (LN-20261023-H2C): `npx tsx --conditions=react-server scripts/precision-steps.mts --account LN-20261023-H2C --force` prints the same comparison for it.", "");
  }

  L.push("## (c) Literature check of the reasoning-task norms (report only; the table is unchanged)", "");
  L.push(...literature(), "");

  L.push("## (d) Population, the six profiles and popularity bias", "");
  const pops = ["v2-0.3", "v2-0.4", "v2-0.5"].map(loadPop).filter((x): x is Pop => !!x);
  if (pops.length) {
    L.push("| Config | People | Strong fits: mean | p10 / median / p90 | Share with 8–20 | Most often strong | Career paths strong for over 30% | Never strong | Tentative archetypes | Flat-profile notes |", "|---|---|---|---|---|---|---|---|---|---|");
    for (const p of pops) {
      const s = p.people.map((x) => x.strong);
      const share = p.lanes.map((id, j) => ({ id, share: p.people.filter((x) => x.bands[j] === "s").length / p.people.length })).sort((a, b) => b.share - a.share);
      L.push(
        `| ${p.config} | ${p.people.length} | ${r1(mean(s))} | ${q(s, 0.1)} / ${q(s, 0.5)} / ${q(s, 0.9)} | ${pct(s.filter((c) => c >= 8 && c <= 20).length / s.length)} | ${nameOf(share[0]!.id)} ${pct(share[0]!.share)} | ${share.filter((x) => x.share > 0.3).length} | ${share.filter((x) => x.share === 0).length} | ${p.people.filter((x) => x.tentative).length} | ${p.people.filter((x) => x.flatNote).length} |`,
      );
    }
    L.push("");
    const a = pops.find((p) => p.config === "v2-0.3");
    const b = pops.find((p) => p.config === "v2-0.5");
    if (a && b && a.people.length === b.people.length) {
      let was = 0;
      let still = 0;
      let possible = 0;
      let newStrong = 0;
      a.people.forEach((pa, i) => {
        const pb = b.people[i]!;
        for (let j = 0; j < pa.bands.length; j++) {
          if (pa.bands[j] === "s") {
            was++;
            if (pb.bands[j] === "s") still++;
            else if (pb.bands[j] === "p") possible++;
          } else if (pb.bands[j] === "s") newStrong++;
        }
      });
      L.push(
        `**Strong-fit survival, v2-0.3 → v2-0.5** (the same ${a.people.length} people. The population's answers are the same, read through each config's own input rules): ${pct(still / was)} of v2-0.3's strong fits are still strong under v2-0.5, ${pct(possible / was)} became possible and ${pct((was - still - possible) / was)} unlikely. v2-0.5 has ${newStrong} strong fits that v2-0.3 didn't (${r1(newStrong / a.people.length)} per person).`,
        "",
      );
      const env = b.people.filter((x) => x.envMaxBefore !== null);
      const shrunk = new Map<string, number>();
      for (const x of env) for (const d of x.envShrunk) shrunk.set(d, (shrunk.get(d) ?? 0) + 1);
      L.push(
        `**Environment cap under v2-0.5:** before the cap, the largest single-dimension share of any fit had median ${pct(q(env.map((x) => x.envMaxBefore!), 0.5))} and 90th percentile ${pct(q(env.map((x) => x.envMaxBefore!), 0.9))}. After it, the maximum is ${pct(Math.max(...env.map((x) => x.envMaxAfter!)))}. ${pct(env.filter((x) => x.envShrunk.length).length / env.length)} of people had at least one dimension shrunk. By dimension: ${[...shrunk].sort((x, y) => y[1] - x[1]).map(([d, n]) => `${d} ${pct(n / env.length)}`).join(", ")}.`,
        "",
      );
    }
  }
  const sat = read<{ database: string; config: string; answered: number; agree: number | null; contradict: number | null }>("satisfaction");
  L.push("## Satisfaction against the current job's band", "");
  L.push(
    !sat
      ? "Not run."
      : sat.answered
        ? `${sat.database}, ${sat.config}: ${sat.answered} people answered. The band agrees with their satisfaction for ${pct(sat.agree!)} and contradicts it for ${pct(sat.contradict!)}.`
        : `${sat.database}: no one has answered "How satisfied are you in this work?" yet. The question is new in this pass, so there is nothing to compare until people answer it.`,
    "",
  );
  L.push("Agreement means strong with 5–7, unlikely with 1–3, and possible with 3–5. A contradiction is strong with 1–2, or unlikely with 6–7. Run `scripts/validate-precision.mts satisfaction --force` with DATABASE_URL set to compute it for production.", "");

  const file = "taxonomy/derived/PRECISION_REPORT.md";
  const head = existsSync(file) ? readFileSync(file, "utf8") : "";
  const start = "<!-- GENERATED:START -->";
  const end = "<!-- GENERATED:END -->";
  const body = `${start}\n${L.join("\n")}\n${end}`;
  writeFileSync(file, head.includes(start) ? head.replace(new RegExp(`${start}[\\s\\S]*${end}`), body) : `# Precision pass report\n\n${body}\n`);
  console.log(`wrote ${file}`);
}

/** Step 1: every transcribed value next to what the scoring uses, so it can be checked against the source. */
function normsSection(): string[] {
  const f = (x: number, d = 2) => x.toFixed(d);
  const L: string[] = ["## Step 1: published norms as transcribed", ""];
  L.push(
    "Each row shows the source's own value, with its table and page, beside the value in `src/lib/scoring/psychometrics.ts` on our metric. Combined-gender columns only.",
    "",
    "### O*NET Interest Profiler Short Form (interests)",
    "",
    "Rounds, Ming, Cao, Song & Lewis (2016), *Development of an O\\*NET Mini Interest Profiler (Mini-IP) for mobile devices*, National Center for O\\*NET Development, https://www.onetcenter.org/dl_files/Mini-IP.pdf. Validation sample N = 575 US adults aged 18–65.",
    "- Means and SDs: **Table 8 (p. 36)**, \"60-Item Interest Profiler Short Form\" rows, Total column.",
    "- Alphas: **Table 9 (p. 37)**, 60-item Short-IP.",
    "- Coding: the table is item means with responses coded 1–5 (p. 11: \"1-(Strongly Dislike) to 3-(Unsure)\"; the Mini-IPIP means in the same table are on 1–5). Our raw score is the sum of 10 items, so the item mean and SD are ×10. p. 13 describes a 0–4 coding for the online tool's own scoring, which is not the metric of Table 8.",
    "",
    "| Scale | Table 8 item mean | Table 8 item SD | Table 9 alpha | Ours: mean (10–50) | Ours: SD |",
    "|---|---|---|---|---|---|",
  );
  for (const [k, v] of Object.entries(ONET_IP)) {
    const p = PSYCHOMETRICS[`onet.${k}`]!;
    L.push(`| ${k} | ${f(v.itemMean)} | ${f(v.itemSd)} | ${f(v.alpha)} | ${f(p.mean, 1)} | ${f(p.sd, 1)} |`);
  }
  const o = opennessWithoutO6();
  L.push(
    "",
    "### IPIP-NEO-120 (personality)",
    "",
    "Kajonius & Johnson (2019), *Europe's Journal of Psychology* 15(2), 260–275, doi:10.5964/ejop.v15i2.1671.",
    "- **Appendix Table A1**, \"Sample Descriptive Statistics of 5 Trait Domains and 30 Facets\": Neuroticism and Extraversion on **p. 274**; Openness, Agreeableness and Conscientiousness on **p. 275**.",
    "- Read from the PMC copy (PMC7871748) and checked against the journal's PDF.",
    "- N = 320,128, combined gender (127,695 men, 192,433 women), mean age 28.13 (SD 10.14).",
    "- The table is on the facet-sum metric (4–20): a domain is the mean of its six facet sums (checked: the mean of N1–N6 is 11.105, against 11.10). Ours are item means (1–5), so mean and SD are ÷4. Reliability is the table's alpha.",
    "- **Not 18–35 norms.** The raw data that would allow them (doi:10.23668/psycharchives.2448, 170 MB) is served from pada.psycharchives.org, which this environment can't reach (psycharchives.org itself can be reached).",
    `- **Openness** without O6 (Liberalism, not administered): the mean of the O1–O5 facet means is exact. The SD is derived from the table's six-facet SD (${f(OPENNESS_WITH_O6.sd)}), assuming equal inter-facet correlations (r̄ = ${f(o.rbar, 3)}), which gives ${f(o.sd, 3)} on the facet-sum metric. O6 is the facet that correlates least with the others, so this SD is probably a little low. There is no published alpha for O1–O5, so it keeps the planning .75.`,
    "",
    "| Scale | Table A1 M | Table A1 SD | Table A1 α | Page | Ours: mean (1–5) | Ours: SD | Ours: reliability |",
    "|---|---|---|---|---|---|---|---|",
  );
  const order = ["Neuroticism", "N1", "N2", "N3", "N4", "N5", "N6", "Extraversion", "E1", "E2", "E3", "E4", "E5", "E6", "Openness", "O1", "O2", "O3", "O4", "O5", "Agreeableness", "A1", "A2", "A3", "A4", "A5", "A6", "Conscientiousness", "C1", "C2", "C3", "C4", "C5", "C6"];
  for (const k of order) {
    const p = PSYCHOMETRICS[`neo.${k}`]!;
    const t = NEO_TABLE_A1[k];
    const src = t ? `${f(t.m)} | ${f(t.sd)} | ${f(t.alpha)} | ${t.page}` : `${f(OPENNESS_WITH_O6.m)} (with O6) | ${f(OPENNESS_WITH_O6.sd)} (with O6) | ${f(OPENNESS_WITH_O6.alpha)} (with O6) | 275`;
    L.push(`| ${k.length > 2 ? `**${k}**` : k} | ${src} | ${f(p.mean, 3)} | ${f(p.sd, 3)} | ${f(p.reliability)}${t ? "" : " (planning)"} |`);
  }
  L.push(
    "",
    "### Mini-IPIP6 Honesty-Humility: left null",
    "",
    "The open-access source for its norms is Sibley et al. (*New Zealand Journal of Psychology*, 2011 validation and 2012 norms papers, on psychology.org.nz). That host can't be reached from this environment, so nothing is transcribed. Honesty-Humility stays without a population comparison: it is shown relative to the person's own scores only, and isn't used in matching.",
  );
  return L;
}

/**
 * (c) Published adult norms for the three tasks, against assessment/calibration/output/
 * difficulty_table.json. Open-access sources only (read in full here); anything not reachable or
 * not open access is reported as "not checked".
 */
function literature(): string[] {
  const t = JSON.parse(readFileSync("assessment/calibration/output/difficulty_table.json", "utf8")) as { norms: { task: string; mean: number; sd: number; confidence: string }[] };
  const n = (task: string) => t.norms.find((x) => x.task === task)!;
  const bd = n("backward_digits");
  const co = n("corsi");
  const sm = n("symbol_match");
  const dev = (ours: { mean: number }, pub: number, pubSd: number) => {
    const d = (ours.mean - pub) / pubSd;
    const shown = Math.abs(d) > 0.5 && Math.abs(d) < 0.51 ? Math.abs(d).toFixed(3) : Math.abs(Math.round(d * 100) / 100).toFixed(2);
    return `${d >= 0 ? "+" : "−"}${shown} SD${Math.abs(d) > 0.5 ? " **(over 0.5 SD: flagged)**" : ""}`;
  };
  // Facchin et al. (2024), Table 2 caption: adjusted = raw + 0.7616·(ln age − 3.864) − 0.4229·(√education − 3.555), centred
  // on the sample's means, so the mean adjusted score ≈ the raw mean 4.97. Expected raw = 4.97 − correction.
  const corr = (age: number, edu: number) => 0.7616 * (Math.log(age) - 3.864) - 0.4229 * (Math.sqrt(edu) - 3.555);
  const young = (age: number) => 4.97 - corr(age, 16);
  const y2 = (age: number) => (Math.round(young(age) * 100) / 100).toFixed(2);
  return [
    "Sources: open access only, read in full here. Anything that couldn't be reached open access is marked **not checked**.",
    "",
    "**Our metric.** Our span protocol (`assessment/generators/generators.ts`, SPAN_PROTOCOL; scored in `src/lib/scoring/cognitive/span.ts`):",
    "- starts at 3, gives two trials per length, stops when both are wrong, and caps at 10 (Corsi at 9);",
    "- scores the longest length with at least one of two correct.",
    "",
    "That is the pass rule of Woods et al.'s \"two-error maximum length\" (TE-ML). It is not their \"maximum length over all trials\" (ML).",
    "",
    "**Deviation** = (our mean − published mean) / published SD.",
    "",
    "| Task | Our table: mean, SD (confidence) | Published adult norm (open access) | Deviation | Comparable? |",
    "|---|---|---|---|---|",
    `| Backward digit span | ${bd.mean}, ${bd.sd} (${bd.confidence}) | **Woods et al. (2011)**, *J. Clin. Exp. Neuropsychol.* 33(1), 101–111, doi:10.1080/13803395.2010.493149, open access as PMC2978794. Backward span, TE-ML. Experiment 1 (Table 2): 31 adults recruited (aged 18–46, mean 26), 30 analysed, each averaged over three sessions: **5.80 (SD 1.42)**. Experiment 2 (Table 6): 763 community adults in Rotorua, New Zealand, aged 18–65, mean age 46.5: **4.61 (SD 1.22)** | ${dev(bd, 5.8, 1.42)} against Experiment 1; ${dev(bd, 4.61, 1.22)} against Experiment 2 | Same pass rule, with these differences: (1) they speak the digits through headphones and an examiner transcribes the spoken recall; ours are shown on screen and typed. (2) Their backward lists start at 2 (Experiment 1) and 4 (Experiment 2); ours start at 3. (3) They step up after one correct and continue to 14 or 10 trials, while we always give both trials at a length and cap at 10. (4) Experiment 2 is much older than our 18–35 group: backward TE-ML falls with age (r = −.14, Table 8). (5) Experiment 1 is small and practised over three sessions |`,
    `| Corsi block span (forward) | ${co.mean}, ${co.sd} (${co.confidence}) | **Facchin et al. (2024)**, *Neurological Sciences* 45(12), 5707–5718, doi:10.1007/s10072-024-07756-6, open access as PMC11554723. 340 healthy Italian adults aged 21–89 (mean 51.6), Table 1: **4.97 (SD 1.03)**. From their age and education correction (Table 2 caption), the expected raw span with 16 years of education is **${y2(25)}** at age 25 and **${y2(30)}** at age 30. That is derived from their regression, not a published norm; the 16 years of education are our assumption (their sample mean is 13.1) | ${dev(co, 4.97, 1.03)} against the whole sample; ${dev(co, young(25), 1.03)} against the derived age-25 value; ${dev(co, young(30), 1.03)} against age 30 | Partly. (1) Their pass rule is stricter: three sequences per length, passed with two of three correct, against our one of two. That alone gives them lower spans. (2) A physical wooden board with the examiner tapping, against our on-screen blocks. (3) A much older sample. (4) The deviations from the derived values divide by the whole-sample SD (1.03), which includes the age and education spread (r = −.46 and .45, Table 1). The SD at a given age and education is smaller, so those deviations are conservative. Kessels et al. (2000), on which our table rests at weight 0.7, couldn't be read open access here: **not checked** |`,
    `| Symbol matching (90 s, same/different triplets, correct − incorrect) | ${sm.mean}, ${sm.sd} (${sm.confidence}) | **Not checked**: no open-access norm for a comparable task was found | — | A task of our own. WAIS Symbol Search and pattern-comparison tasks differ in stimuli, time limit and scoring |`,
    "",
    "**What this flags (report only; the table is unchanged):**",
    "- **Backward digit span** is 0.65 SD above the community sample. That is over the threshold, but the sample is far older than our 18–35 group (mean age 46.5). It sits 0.28 SD below the small young-adult sample, so it falls between the two published groups. The checkable sources don't suggest a problem, but the modality differs.",
    "- **Corsi span** is far above the 21–89 sample (+1.17 SD). Against the derived young-adult values it is just over to clearly over the threshold (+0.505 to +0.64 SD, conservative). Their stricter pass rule and the board also push their spans down, so part of the gap is method, not norm. Kessels et al. (2000) is the comparable source, and it couldn't be checked here.",
    "- **Symbol matching:** not checked. Its norm is still Claude's expert estimate alone (confidence low).",
  ];
}
