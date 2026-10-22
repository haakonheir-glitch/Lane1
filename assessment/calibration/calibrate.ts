/**
 * Offline calibration: asks a model how the target population would do on each sample item,
 * fits a 3PL per task × level, and writes output/difficulty_table.json + output/report.md.
 *
 *   npm run calibrate -- --mock                  # no network, no cost; writes output/mock/
 *   npm run calibrate                            # real run (reads ANTHROPIC_API_KEY)
 *   npm run calibrate -- --model claude-opus-5-5 --max-calls 300
 *
 * Answers are cached in cache/<model>/<prompt version>/, so an interrupted run resumes for free.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import {
  CONCURRENCY,
  CONFIGURATIONS,
  DEFAULT_MAX_CALLS,
  DEFAULT_MODEL,
  NORM_REPEATS,
  NORM_TASKS,
  OUTPUT_TOKENS_PER_CALL,
  PRICES,
  PROMPT_VERSION,
  REPEATS_PER_ITEM,
  configKey,
  type NormTask,
} from "./config";
import type { Call } from "./fit";
import { checkItemEstimate, checkNormEstimate, claudeModel, mockModel, ITEM_SYSTEM, itemUserMessage, NORM_SYSTEM, normUserMessage, type Answer, type CalibrationModel, type Usage } from "./model";
import { buildTable, renderReport, type Failure, type NormCall, type RunInfo } from "./output";
import { calibrationItems, type CalibrationItem } from "./render";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ATTEMPTS = 3;

function parseArgs(argv: string[]) {
  const args = { mock: false, model: DEFAULT_MODEL, maxCalls: DEFAULT_MAX_CALLS, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mock") args.mock = true;
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--model") args.model = argv[++i] ?? "";
    else if (a === "--max-calls") args.maxCalls = Number(argv[++i]);
    else throw new Error(`Unknown argument ${a}. Use --mock, --dry-run, --model <id>, --max-calls <n>.`);
  }
  if (!args.model) throw new Error("--model needs a model id");
  if (!(args.maxCalls > 0)) throw new Error("--max-calls needs a positive number");
  return args;
}

type Job =
  | { kind: "item"; key: string; item: CalibrationItem; repeat: number }
  | { kind: "norm"; key: string; task: NormTask; repeat: number };

type Cached = { value: unknown; model: string; usage: Usage };

/** Errors that retrying won't fix: stop the whole run instead of burning calls. */
const fatal = (e: unknown) =>
  e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError || e instanceof Anthropic.NotFoundError || e instanceof Anthropic.BadRequestError;

/** Rough input size for the estimate: ~4 characters per token. */
const approxTokens = (s: string) => Math.ceil(s.length / 4);

function priceOf(model: string, fallback: string) {
  return PRICES[model] ?? PRICES[fallback] ?? null;
}

async function pool<T>(items: T[], n: number, work: (t: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) await work(items[next++]!);
    }),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const model: CalibrationModel = args.mock || args.dryRun ? mockModel() : claudeModel(args.model);
  const modelName = args.mock ? "mock" : args.model;
  const cacheDir = join(HERE, "cache", modelName.replace(/[^\w.-]/g, "_"), PROMPT_VERSION);
  const outDir = join(HERE, "output", ...(args.mock ? ["mock"] : []));
  mkdirSync(cacheDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  const items = calibrationItems();
  const jobs: Job[] = [
    ...items.flatMap((item) => Array.from({ length: REPEATS_PER_ITEM }, (_, repeat) => ({ kind: "item" as const, key: `${item.id}__r${repeat}`, item, repeat }))),
    ...NORM_TASKS.flatMap((task) => Array.from({ length: NORM_REPEATS }, (_, repeat) => ({ kind: "norm" as const, key: `norm_${task}__r${repeat}`, task, repeat }))),
  ];
  const cachePath = (j: Job) => join(cacheDir, `${j.key.replace(/[^\w.-]/g, "_")}.json`);
  const todo = jobs.filter((j) => !existsSync(cachePath(j)));

  // Preflight: how many calls, what they might cost, and the hard limit.
  const price = priceOf(args.model, DEFAULT_MODEL);
  const inputTokens = todo.reduce(
    (s, j) => s + approxTokens(j.kind === "item" ? ITEM_SYSTEM() + itemUserMessage(j.item) : NORM_SYSTEM() + normUserMessage(j.task)),
    0,
  );
  console.log(`Calibration — model ${modelName}, prompt ${PROMPT_VERSION}`);
  console.log(`  ${jobs.length} answers needed (${items.length} items × ${REPEATS_PER_ITEM} + ${NORM_TASKS.length} norm tasks × ${NORM_REPEATS}); ${jobs.length - todo.length} cached; ${todo.length} calls to make.`);
  if (!args.mock && price) {
    const [lo, hi] = OUTPUT_TOKENS_PER_CALL.map((o) => (inputTokens * price.input + todo.length * o * price.output) / 1e6);
    console.log(`  Estimated cost: $${lo!.toFixed(2)}–$${hi!.toFixed(2)} (~${inputTokens.toLocaleString("en")} input tokens; ${OUTPUT_TOKENS_PER_CALL.join("–")} output tokens per call incl. thinking). Retries add to this.`);
  }
  if (todo.length > args.maxCalls) {
    console.error(`  Aborting: ${todo.length} calls exceed --max-calls ${args.maxCalls}. Raise the limit if this is intended.`);
    process.exit(2);
  }
  if (args.dryRun) return;

  let apiCalls = 0;
  let costUsd = 0;
  let done = 0;
  const failures: Failure[] = [];
  const answers = new Map<string, Cached>();
  for (const j of jobs) if (!todo.includes(j)) answers.set(j.key, JSON.parse(readFileSync(cachePath(j), "utf8")) as Cached);

  const charge = (a: Answer<unknown>) => {
    const p = priceOf(a.model, args.model);
    if (p) costUsd += (a.usage.inputTokens * p.input + a.usage.outputTokens * p.output) / 1e6;
  };

  let stop: Error | null = null;
  await pool(todo, CONCURRENCY, async (j) => {
    let lastError = "";
    for (let attempt = 1; attempt <= ATTEMPTS && !stop; attempt++) {
      if (apiCalls >= args.maxCalls) {
        lastError = `--max-calls ${args.maxCalls} reached`;
        break;
      }
      apiCalls++;
      try {
        const a: Answer<unknown> = j.kind === "item" ? await model.item(j.item, j.repeat) : await model.norm(j.task, j.repeat);
        charge(a);
        const problem = j.kind === "item" ? checkItemEstimate(a.value as never) : checkNormEstimate(a.value as never);
        if (problem) {
          lastError = `invalid answer: ${problem}`;
          continue;
        }
        const cached: Cached = { value: a.value, model: a.model, usage: a.usage };
        writeFileSync(cachePath(j), JSON.stringify(cached, null, 2) + "\n");
        answers.set(j.key, cached);
        lastError = "";
        break;
      } catch (e) {
        if (fatal(e)) {
          stop = e instanceof Error ? e : new Error(String(e));
          break;
        }
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
    if (lastError) failures.push({ key: j.key, error: lastError });
    done++;
    if (!args.mock && (done % 10 === 0 || done === todo.length)) console.log(`  ${done}/${todo.length} done · ${apiCalls} calls · $${costUsd.toFixed(2)}`);
  });
  if (stop) {
    // The SDK's message names the problem (bad key, unknown model, …); it never contains the key.
    console.error(`Stopped: ${(stop as Error).message}`);
    console.error(`Answers so far are cached; ${apiCalls} calls made, ~$${costUsd.toFixed(2)}.`);
    process.exit(1);
  }

  // Collect.
  const servedBy: Record<string, number> = {};
  const calls = new Map<string, Call[]>();
  const normCalls: NormCall[] = [];
  for (const j of jobs) {
    const a = answers.get(j.key);
    if (!a) continue;
    servedBy[a.model] = (servedBy[a.model] ?? 0) + 1;
    if (j.kind === "item") {
      const v = a.value as { p16: number; p50: number; p84: number };
      const k = configKey(j.item);
      calls.set(k, [...(calls.get(k) ?? []), { p16: v.p16, p50: v.p50, p84: v.p84, itemId: j.item.id, repeat: j.repeat }]);
    } else {
      const v = a.value as { mean: number; sd: number; basis: string };
      normCalls.push({ task: j.task, repeat: j.repeat, ...v });
    }
  }

  const run: RunInfo = { model: modelName, date: new Date().toISOString().slice(0, 10), mock: args.mock, servedBy, apiCalls, costUsd, failures };
  const { table, fits } = buildTable(calls, normCalls, run);
  const examples = CONFIGURATIONS.map((c) => items.find((i) => i.task === c.task && i.level === c.level)!);
  writeFileSync(join(outDir, "difficulty_table.json"), JSON.stringify(table, null, 2) + "\n");
  writeFileSync(join(outDir, "report.md"), renderReport(table, fits, run, examples));

  console.log(`Done: ${apiCalls} API calls, $${costUsd.toFixed(2)}, ${failures.length} failed.`);
  console.log(`  ${join(outDir, "difficulty_table.json")}`);
  console.log(`  ${join(outDir, "report.md")}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
