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
  L.push(...LITERATURE, "");

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

/**
 * (c) Published adult norms for the three tasks, against assessment/calibration/output/
 * difficulty_table.json. The primary sources' hosts are blocked from this environment: figures
 * marked "secondary" are as quoted by the source named, not checked against the paper's table.
 */
const LITERATURE: string[] = (() => {
  const t = JSON.parse(readFileSync("assessment/calibration/output/difficulty_table.json", "utf8")) as { norms: { task: string; mean: number; sd: number; confidence: string }[] };
  const n = (task: string) => t.norms.find((x) => x.task === task)!;
  const bd = n("backward_digits");
  const co = n("corsi");
  const sm = n("symbol_match");
  const dev = (ours: { mean: number; sd: number }, pub: number, pubSd: number) => {
    const d = (ours.mean - pub) / pubSd;
    return `${d >= 0 ? "+" : "−"}${Math.abs(Math.round(d * 100) / 100).toFixed(2)} SD${Math.abs(d) > 0.5 ? " **(over 0.5 SD: flagged)**" : ""}`;
  };
  return [
    "Our metric for both span tasks is the longest sequence repeated correctly (adaptive, 6–14 trials). Deviations below are (our mean − published mean) / published SD.",
    "",
    "| Task | Our table (mean, SD, confidence) | Published adult norm | Deviation | Comparable? |",
    "|---|---|---|---|---|",
    `| Corsi forward span | ${co.mean}, ${co.sd}, ${co.confidence} | 6.2 (SD 1.3), healthy adults: Kessels, van Zandvoort, Postma, Kappelle & de Haan (2000), *Applied Neuropsychology* 7(4), 252–258, doi:10.1207/s15324826an0704_8. **Secondary**: the figure as quoted by PsyToolkit's Corsi page; the paper itself could not be opened here | ${dev(co, 6.2, 1.3)} | Yes: the same task and metric. Our table already weights this source at 0.7 |`,
    `| Backward digit span | ${bd.mean}, ${bd.sd}, ${bd.confidence} | Young adults 6.00 (computerised, auditory; "mean span" metric). Community adults 18–65 (n = 763): 4.91. Woods et al. (2011), *J. Clin. Exp. Neuropsychology* 33(1), 101–111, doi:10.1080/13803395.2010.493149. **Secondary**: the figures as quoted by a commercial site; SDs not obtained, so ours (1.3) is used | ${dev(bd, 6.0, bd.sd)} against young adults; ${dev(bd, 4.91, bd.sd)} against 18–65 | Partly: their mean-span metric is not the longest span, and their digits are auditory where ours are visual. Monaco et al. (2013), *Neurological Sciences* 34(5), 749–754, has Italian adult norms for both span tasks, but the values could not be read here |`,
    `| Symbol matching (90 s, same/different triplets, correct − incorrect) | ${sm.mean}, ${sm.sd}, ${sm.confidence} | None found for this task | — | No: a task of our own. WAIS Symbol Search and Salthouse's pattern comparison differ in stimuli, time limit and scoring, so their norms don't transfer |`,
    "",
    "Nothing is flagged at the 0.5 SD threshold on what could be checked. Backward digit span sits 0.46 SD below the young-adult figure, close to the line, and that comparison is uncertain on two counts: the metric differs, and the source is secondary. Before the table is relied on, the primary papers should be checked (pmc.ncbi.nlm.nih.gov, link.springer.com and tandfonline.com are blocked here).",
  ];
})();
