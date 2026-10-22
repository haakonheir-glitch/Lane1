/**
 * Provisional norming, step 1: what to calibrate and how.
 *
 * Claude is used ONLY by the offline script in this folder, to estimate how the human target
 * population would perform. The app never calls a model to score anyone: it reads the fixed
 * table this script writes (output/difficulty_table.json).
 */

export type TaskId = "matrix" | "number_series" | "letter_series" | "quant" | "rotation2d";

/** One difficulty estimate per task × level. `c` is the guessing floor of the response format. */
export type Configuration = { task: TaskId; level: number; c: number; levelName: string };

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const CONFIGURATIONS: Configuration[] = [
  ...range(1, 4).map((level) => ({ task: "matrix" as const, level, c: 1 / 8, levelName: "activeRules" })),
  ...range(1, 4).map((level) => ({ task: "number_series" as const, level, c: 0.2, levelName: "level" })),
  ...range(1, 3).map((level) => ({ task: "letter_series" as const, level, c: 0.2, levelName: "level" })),
  ...range(1, 4).map((level) => ({ task: "quant" as const, level, c: 0.25, levelName: "level" })),
  // Both correct of 4 must be selected: 1 of C(4,2) = 6 pairs.
  ...range(5, 8).map((level) => ({ task: "rotation2d" as const, level, c: 1 / 6, levelName: "cellsN" })),
];

export const configKey = (c: Pick<Configuration, "task" | "level">) => `${c.task}:${c.level}`;

export const ITEMS_PER_CONFIG = 6;
export const REPEATS_PER_ITEM = 2;

/** Fixed seeds, one block per task, so the sample items never change between runs. */
const TASK_SEED_BASE: Record<TaskId, number> = { matrix: 910_000, number_series: 920_000, letter_series: 930_000, quant: 940_000, rotation2d: 950_000 };
export const itemSeed = (task: TaskId, level: number, i: number) => TASK_SEED_BASE[task] + level * 100 + i;

/** Span and speed tasks: population distributions instead of item difficulty. */
export type NormTask = "backward_digits" | "corsi" | "symbol_match" | "choice_rt";
export const NORM_TASKS: NormTask[] = ["backward_digits", "corsi", "symbol_match", "choice_rt"];
export const NORM_REPEATS = 3;

/** Literature anchors, blended with Claude's estimate. Others are marked low confidence. */
export const LITERATURE_ANCHORS: Partial<Record<NormTask, { mean: number; sd: number; weight: number; source: string }>> = {
  corsi: {
    mean: 6.2,
    sd: 1.3,
    weight: 0.7,
    source: "Kessels, R. P. C., van Zandvoort, M. J. E., Postma, A., Kappelle, L. J., & de Haan, E. H. F. (2000). The Corsi Block-Tapping Task: standardization and normative data. Applied Neuropsychology, 7(4), 252–258. Healthy adults.",
  },
};
// Balloon and delay discounting are excluded: they measure styles, not abilities, so no score is better or worse.

export const DEFAULT_MODEL = "claude-fable-5-1";
/** Bump when a prompt changes, so cached answers to the old prompt aren't reused. */
export const PROMPT_VERSION = "v1";

/** Per-million-token prices used for the pre-run estimate (USD). */
export const PRICES: Record<string, { input: number; output: number }> = {
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
};
/** Assumed output tokens per call (thinking + JSON) for the low and high cost estimate. */
export const OUTPUT_TOKENS_PER_CALL: [number, number] = [1_000, 4_000];

export const DEFAULT_MAX_CALLS = 300;
export const CONCURRENCY = 4;
export const BOOTSTRAP_SAMPLES = 2_000;
export const BOOTSTRAP_SEED = 20_261_022;
