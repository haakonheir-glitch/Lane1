/**
 * Client-safe render payloads. Nothing here carries a scoring key, answer, item seed,
 * scale/facet code or validity-item identity. Built by the route handlers (toPublic*).
 */
import type { CognitiveTaskId, ItemStatus, ResponseFormat } from "./types";

export type PublicBlock = {
  id: string;
  title: string;
  stem?: string;
  prefix?: string;
  status: ItemStatus;
  /** 1-based index of this block in the session, and the block count. */
  index: number;
  count: number;
  /** True when the block shows O*NET content (attribution required). */
  onet: boolean;
};

export type PublicStep =
  | {
      kind: "item";
      position: number;
      total: number;
      block: PublicBlock;
      /** Position-based token; the item id is never sent (it would reveal validity items). */
      item: { token: string; text: string; format: ResponseFormat };
      /** Previously saved answer when revisiting. */
      value?: unknown;
    }
  | { kind: "env_check"; position: number; total: number; block: PublicBlock; questions: string[] }
  | {
      kind: "task";
      position: number;
      total: number;
      block: PublicBlock;
      task: { id: CognitiveTaskId; title: string; instructions: string; practice: number; minutes: number };
    }
  | {
      kind: "done";
      status: "completed" | "discarded";
      confidence: "ok" | "low" | null;
      flags: string[];
      unlocks: string;
      effort: "keep" | "offer_redo" | "discard" | null;
      hasExperimental: boolean;
    };

/* ---- cognitive trial payloads ---- */

export type PublicCell = { shape: number; count: number; fill: number; rotation: number };
/** A rotated polyomino: each square as four corner points, already rotated. */
export type PublicPolygon = [number, number][][];

export type PublicTrial =
  | { task: "matrix"; grid: (PublicCell | null)[]; options: PublicCell[]; timeLimitSec: number }
  | { task: "number_series" | "letter_series"; shown: (number | string)[]; options: (number | string)[]; timeLimitSec: number }
  | { task: "quant"; text: string; options: number[]; timeLimitSec: number }
  | { task: "rotation2d"; target: PublicPolygon; options: PublicPolygon[]; timeLimitSec: number }
  | { task: "backward_digits" | "corsi"; sequence: number[]; presentationMs: number; isiMs: number; layout?: [number, number][] }
  | { task: "symbol_match"; pairs: { left: string[]; right: string[] }[]; durationSec: number }
  | { task: "choice_rt"; trials: { stimulus: number; foreperiodMs: number }[] }
  | { task: "learning_rate"; block: number; blocks: number; trialInBlock: number; trialsPerBlock: number; symbol: string; keys: number }
  | { task: "balloon"; balloon: number; balloons: number; pointsPerPump: number; maxPumps: number; total: number }
  | { task: "delay_discount"; sooner: number; later: number; delayDays: number; choice: number; choices: number };

export type TaskResponse =
  | { kind: "choice"; choice: number | null }
  | { kind: "multi"; selected: number[] }
  | { kind: "sequence"; sequence: number[] }
  | { kind: "batch"; answers: { index: number; answer: number | null; rtMs: number }[] }
  | { kind: "key"; key: number }
  | { kind: "pump"; pumps: number }
  | { kind: "collect"; pumps: number }
  | { kind: "pick"; option: "sooner" | "later" };

export type TaskTurn = {
  /** The trial to show next, or null when the task is finished. */
  trial: (PublicTrial & { index: number; practice: boolean; scoredTotal: number | null }) | null;
  /** Correct/incorrect for practice items and the learning task only. */
  feedback?: { correct: boolean };
  /** Balloon: result of the last pump. */
  balloon?: { burst: boolean; pumps: number; banked: number };
};

export type DeviceInfo = { deviceClass: "phone" | "tablet" | "desktop"; inputType: "keyboard" | "mouse" | "touch"; viewport: string };
