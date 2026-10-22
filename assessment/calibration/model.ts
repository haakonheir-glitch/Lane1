/**
 * The models the calibration script asks: Claude (real) or a deterministic stand-in (--mock).
 * Offline only; nothing here is imported by the app.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { pCorrect } from "./fit";
import type { NormTask } from "./config";
import type { CalibrationItem } from "./render";

const here = fileURLToPath(new URL(".", import.meta.url));
const prompt = (name: string) => readFileSync(`${here}prompts/${name}`, "utf8").trim();

export const ItemEstimateSchema = z.object({ p16: z.number(), p50: z.number(), p84: z.number(), drivers: z.array(z.string()) });
export const NormEstimateSchema = z.object({ mean: z.number(), sd: z.number(), basis: z.string() });
export type ItemEstimate = z.infer<typeof ItemEstimateSchema>;
export type NormEstimate = z.infer<typeof NormEstimateSchema>;

/** Content checks beyond the JSON shape; a failing answer is asked again. */
export function checkItemEstimate(e: ItemEstimate): string | null {
  for (const k of ["p16", "p50", "p84"] as const) if (!(e[k] >= 0 && e[k] <= 1)) return `${k} = ${e[k]} is not between 0 and 1`;
  if (!(e.p16 <= e.p50 && e.p50 <= e.p84)) return `probabilities not ordered: ${e.p16}, ${e.p50}, ${e.p84}`;
  if (e.drivers.length < 2 || e.drivers.length > 4) return `${e.drivers.length} drivers (need 2–4)`;
  return null;
}
export function checkNormEstimate(e: NormEstimate): string | null {
  if (!(e.mean > 0) || !(e.sd > 0)) return `mean ${e.mean} / sd ${e.sd} must be positive`;
  return null;
}

export type Usage = { inputTokens: number; outputTokens: number };
export type Answer<T> = { value: T; model: string; usage: Usage };

export interface CalibrationModel {
  name: string;
  item(item: CalibrationItem, repeat: number): Promise<Answer<ItemEstimate>>;
  norm(task: NormTask, repeat: number): Promise<Answer<NormEstimate>>;
}

const FORMAT: Record<CalibrationItem["task"], string> = {
  matrix: "choose 1 of 8 options",
  number_series: "choose 1 of 5 options",
  letter_series: "choose 1 of 5 options",
  quant: "choose 1 of 4 options",
  rotation2d: "select both correct options out of 4",
};

export const ITEM_SYSTEM = () => prompt("item-system.md");
export const itemUserMessage = (item: CalibrationItem) =>
  prompt("item-user.md").replace("{{format}}", FORMAT[item.task]).replace("{{chance}}", item.c.toFixed(3)).replace("{{item}}", item.text);
export const NORM_SYSTEM = () => prompt("norms-system.md");
export function normUserMessage(task: NormTask): string {
  const all = prompt("norms-tasks.md");
  const section = all.split(/^## /m).find((s) => s.startsWith(`${task}\n`));
  if (!section) throw new Error(`No protocol text for ${task} in prompts/norms-tasks.md`);
  return `Task and scoring protocol:\n\n${section.slice(task.length + 1).trim()}`;
}

/** Reads ANTHROPIC_API_KEY (and ANTHROPIC_WORKSPACE_ID) from the environment, else from .env.local. Never prints them. */
function loadKey() {
  if (!process.env.ANTHROPIC_API_KEY) {
    try {
      for (const line of readFileSync(`${here}../../.env.local`, "utf8").split(/\r?\n/)) {
        const m = /^\s*(ANTHROPIC_API_KEY|ANTHROPIC_WORKSPACE_ID)\s*=\s*(.+?)\s*$/.exec(line);
        if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
      }
    } catch {
      // no .env.local
    }
  }
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set (looked in the environment and in .env.local).");
}

export function claudeModel(model: string): CalibrationModel {
  loadKey();
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
  // The SDK retries 429, 5xx and connection errors with exponential backoff (honouring retry-after).
  const client = new Anthropic({ maxRetries: 6, ...(workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {}) });

  async function ask<T>(system: string, user: string, schema: z.ZodType<T>): Promise<Answer<T>> {
    const res = await client.beta.messages.parse({
      model,
      max_tokens: 16000,
      // Server-side fallback (on by default for this model): if a safety classifier declines,
      // another model answers within the same call. The answering model is recorded per call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "refusal") throw new Error("model declined");
    if (res.stop_reason === "max_tokens" || res.parsed_output == null) throw new Error("incomplete or unparseable answer");
    return { value: res.parsed_output, model: res.model, usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens } };
  }

  return {
    name: model,
    item: (item) => ask(ITEM_SYSTEM(), itemUserMessage(item), ItemEstimateSchema),
    norm: (task) => ask(NORM_SYSTEM(), normUserMessage(task), NormEstimateSchema),
  };
}

/* ------------------------------------------------------------------ mock */

/** FNV-1a hash → [0, 1). */
function unit(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h / 4294967296;
}
const noise = (key: string, size: number) => (unit(key) * 2 - 1) * size;

/** Plausible difficulty by task and level, used only by the mock. */
const MOCK_B: Record<CalibrationItem["task"], (level: number) => number> = {
  matrix: (l) => -1.6 + 0.9 * (l - 1),
  number_series: (l) => -1.4 + 0.7 * (l - 1),
  letter_series: (l) => -1.0 + 0.6 * (l - 1),
  quant: (l) => -1.2 + 0.75 * (l - 1),
  rotation2d: (l) => -0.6 + 0.35 * (l - 5),
};
const MOCK_NORMS: Record<NormTask, { mean: number; sd: number }> = {
  backward_digits: { mean: 5.3, sd: 1.2 },
  corsi: { mean: 5.6, sd: 1.1 },
  symbol_match: { mean: 38, sd: 9 },
  choice_rt: { mean: 480, sd: 70 },
};

/** Deterministic stand-in: same inputs, same answers, no network, no cost. */
export function mockModel(): CalibrationModel {
  return {
    name: "mock",
    async item(item, repeat) {
      const b = MOCK_B[item.task](item.level) + noise(`b|${item.id}`, 0.45) + noise(`r|${item.id}|${repeat}`, 0.15);
      const a = 1.1 + noise(`a|${item.id}|${repeat}`, 0.3);
      const p = (t: number) => Math.round(pCorrect(t, a, b, item.c) * 100) / 100;
      return {
        value: { p16: p(-1), p50: p(0), p84: p(1), drivers: ["mock driver: number of rules", "mock driver: time limit"] },
        model: "mock",
        usage: { inputTokens: 0, outputTokens: 0 },
      };
    },
    async norm(task, repeat) {
      const m = MOCK_NORMS[task];
      return { value: { mean: m.mean * (1 + noise(`m|${task}|${repeat}`, 0.04)), sd: m.sd * (1 + noise(`s|${task}|${repeat}`, 0.08)), basis: "mock" }, model: "mock", usage: { inputTokens: 0, outputTokens: 0 } };
    },
  };
}
