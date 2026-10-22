/**
 * Builds the two outputs from the collected answers: the fixed difficulty table the app reads
 * (difficulty_table.json) and a readable report (report.md). Pure apart from the inputs given.
 */
import { BOOTSTRAP_SAMPLES, BOOTSTRAP_SEED, CONFIGURATIONS, LITERATURE_ANCHORS, NORM_TASKS, PROMPT_VERSION, configKey, type NormTask, type TaskId } from "./config";
import { blendNorm, DISAGREEMENT_IQR, fitTask, median, pCorrect, type Call, type ConfigFit } from "./fit";
import type { CalibrationItem } from "./render";

export type NormCall = { task: NormTask; repeat: number; mean: number; sd: number; basis: string };
export type Failure = { key: string; error: string };
export type RunInfo = { model: string; date: string; mock: boolean; servedBy: Record<string, number>; apiCalls: number; costUsd: number; failures: Failure[] };

export type TableRow = {
  task: TaskId;
  level: number;
  level_name: string;
  a: number;
  b: number;
  c: number;
  se_b: number;
  sd_b_within: number;
  n_calls: number;
  model: string;
  date: string;
  flags: string[];
};
export type NormRow = { task: NormTask; mean: number; sd: number; confidence: "moderate" | "low"; sources: string[]; n_calls: number; claude: { mean: number; sd: number } };
export type DifficultyTable = {
  version: 1;
  provisional: true;
  mock: boolean;
  model: string;
  prompt_version: string;
  date: string;
  note: string;
  items: TableRow[];
  norms: NormRow[];
  excluded: { task: string; reason: string }[];
};

const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const TASK_ORDER: TaskId[] = ["matrix", "number_series", "letter_series", "quant", "rotation2d"];

export function buildTable(calls: Map<string, Call[]>, normCalls: NormCall[], run: RunInfo): { table: DifficultyTable; fits: Map<TaskId, ConfigFit[]> } {
  const fits = new Map<TaskId, ConfigFit[]>();
  const rows: TableRow[] = [];
  for (const task of TASK_ORDER) {
    const configs = CONFIGURATIONS.filter((c) => c.task === task);
    const usable = configs.filter((c) => (calls.get(configKey(c))?.length ?? 0) >= 2);
    const taskFits = fitTask(
      usable.map((c) => ({ level: c.level, c: c.c, calls: calls.get(configKey(c))! })),
      { samples: BOOTSTRAP_SAMPLES, seed: BOOTSTRAP_SEED + TASK_ORDER.indexOf(task) * 100 },
    );
    fits.set(task, taskFits);
    for (const f of taskFits) {
      const cfg = configs.find((c) => c.level === f.level)!;
      rows.push({
        task,
        level: f.level,
        level_name: cfg.levelName,
        a: r4(f.a),
        b: r4(f.b),
        c: r4(f.c),
        se_b: r4(f.seB),
        sd_b_within: r4(f.sdBWithin),
        n_calls: f.nCalls,
        model: run.model,
        date: run.date,
        flags: f.flags,
      });
    }
  }

  const norms: NormRow[] = NORM_TASKS.flatMap((task) => {
    const cs = normCalls.filter((n) => n.task === task);
    if (!cs.length) return [];
    const claude = { mean: median(cs.map((n) => n.mean)), sd: median(cs.map((n) => n.sd)) };
    const anchor = LITERATURE_ANCHORS[task];
    const blended = blendNorm(claude, anchor);
    return [
      {
        task,
        mean: r4(blended.mean),
        sd: r4(blended.sd),
        confidence: anchor ? ("moderate" as const) : ("low" as const),
        sources: [
          ...(anchor ? [`${anchor.source} Weight ${anchor.weight}.`] : []),
          `Expert estimate by ${run.model} (median of ${cs.length} calls)${anchor ? `, weight ${(1 - anchor.weight).toFixed(1)}` : ""}.`,
        ],
        n_calls: cs.length,
        claude: { mean: r4(claude.mean), sd: r4(claude.sd) },
      },
    ];
  });

  return {
    fits,
    table: {
      version: 1,
      provisional: true,
      mock: run.mock,
      model: run.model,
      prompt_version: PROMPT_VERSION,
      date: run.date,
      note:
        "Provisional norms from expert-style estimates (offline, by a language model), not from human data. 3PL with c fixed: P(θ) = c + (1 − c)/(1 + exp(−a(θ − b))), θ in SD units of the target population (adults 18–35, Norway). Replace with empirical calibration when response data exists.",
      items: rows,
      norms,
      excluded: [
        { task: "balloon", reason: "measures a style (risk taking), not an ability: no higher-is-better norm" },
        { task: "delay_discount", reason: "measures a style (time preference), not an ability: no higher-is-better norm" },
      ],
    },
  };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : "–");

export function renderReport(table: DifficultyTable, fits: Map<TaskId, ConfigFit[]>, run: RunInfo, examples: CalibrationItem[]): string {
  const out: string[] = [];
  const title = table.mock ? "Calibration report — MOCK (no model was called; numbers are made up)" : "Calibration report";
  out.push(`# ${title}`, "");
  out.push(`- Model asked: \`${run.model}\`; prompt version ${table.prompt_version}; ${run.date}`);
  const served = Object.entries(run.servedBy).map(([m, n]) => `\`${m}\` × ${n}`).join(", ");
  out.push(`- Answers served by: ${served || "–"}`);
  out.push(`- Model calls this run: ${run.apiCalls} (cached answers are reused and cost nothing); cost this run: $${run.costUsd.toFixed(2)}`);
  out.push(`- Failed calls (dropped after retries): ${run.failures.length}`);
  out.push("");
  out.push(
    "How to read this: for each task and level, **average** is the estimated chance that an average person (50th percentile, θ = 0) gets an item right; **−1 SD** and **+1 SD** are the 16th and 84th percentiles. b is difficulty on that same SD scale (the ability with a 50% chance above guessing); a is how sharply the item separates people. These are provisional estimates, not human data.",
    "",
  );

  const allFlags = [...fits.values()].flat().filter((f) => f.flags.length);
  out.push("## Summary of flags", "");
  if (!allFlags.length) out.push("No flags.", "");
  else {
    const disagree = allFlags.filter((f) => f.flags.some((x) => x.startsWith("calls disagree"))).length;
    const unseparated = allFlags.filter((f) => f.flags.some((x) => x.startsWith("not clearly separated"))).length;
    out.push(`- Calls disagree (IQR of p50 > ${DISAGREEMENT_IQR}): ${disagree} configuration(s)`);
    out.push(`- Level not clearly separated from the one below: ${unseparated} configuration(s)`);
    out.push(`- Details in the task tables below.`, "");
  }

  for (const [task, taskFits] of fits) {
    out.push(`## ${task}`, "");
    if (!taskFits.length) {
      out.push("No usable answers.", "");
      continue;
    }
    const levelName = table.items.find((r) => r.task === task)?.level_name ?? "level";
    out.push(`| ${levelName} | −1 SD | average | +1 SD | a | b | se(b) | sd(b) within | calls | IQR p50 | flags |`);
    out.push("|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|");
    for (const f of taskFits) {
      const p = (t: number) => pct(pCorrect(t, f.a, f.b, f.c));
      out.push(`| ${f.level} | ${p(-1)} | **${p(0)}** | ${p(1)} | ${f2(f.a)} | ${f2(f.b)} | ${f2(f.seB)} | ${f2(f.sdBWithin)} | ${f.nCalls} | ${f2(f.iqrP50)} | ${f.flags.map((x) => `⚠ ${x}`).join("<br>") || "–"} |`);
    }
    out.push("");
  }

  out.push("## Span and speed norms", "");
  out.push("| task | mean | SD | confidence | Claude's estimate | sources |");
  out.push("|---|---:|---:|---|---|---|");
  for (const n of table.norms) out.push(`| ${n.task} | ${f2(n.mean)} | ${f2(n.sd)} | ${n.confidence} | ${f2(n.claude.mean)} / ${f2(n.claude.sd)} | ${n.sources.join(" ")} |`);
  out.push("", "choice_rt is a median reaction time in ms: lower is faster. Balloon and delay discounting are excluded: they measure styles, not abilities.", "");

  if (run.failures.length) {
    out.push("## Failed calls", "");
    for (const f of run.failures) out.push(`- \`${f.key}\`: ${f.error}`);
    out.push("");
  }

  out.push("## Appendix: one item per configuration, as the model saw it", "");
  for (const it of examples) out.push(`### ${it.task}, level ${it.level} (\`${it.id}\`)`, "", "```", it.text, "```", "");
  return out.join("\n");
}
