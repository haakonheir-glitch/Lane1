/**
 * Normalised assessment types shared by the loader, scoring and route handlers.
 * Server-side shapes (with keys) live here; the client-safe render payload is in ./public.ts.
 */

export type ItemStatus = "validated" | "experimental";

export type LikertOption = { value: number; label: string };

export type ResponseFormat =
  | { type: "likert5" | "likert7"; options: LikertOption[] }
  | { type: "single"; options: string[] }
  | { type: "multi"; options: string[]; max?: number; exclusive?: string[] }
  | { type: "text" }
  | { type: "number"; unit?: string }
  | { type: "slider_0_100" }
  | { type: "forced_q_sort"; columns: LikertOption[]; capacities: number[]; cards: { id: string; text: string }[] }
  | { type: "sjt"; question: string; options: string[] }
  | { type: "ideas"; seconds: number; instructions?: string }
  | { type: "task"; taskId: CognitiveTaskId };

export type ValidityRule =
  | { kind: "infrequency"; failIfGte: number }
  | { kind: "instructed"; passIfEq: number }
  | { kind: "effort" };

export type BankItem = {
  id: string;
  /** Source file id, e.g. "01_personality_ipip_neo_120". */
  module: string;
  text: string;
  format: ResponseFormat;
  status: ItemStatus;
  /** Scale, facet or value the item scores (server only). */
  scale?: string;
  facet?: string;
  domain?: string;
  key?: 1 | -1;
  /** SJT key: index of the keyed option (server only). */
  keyIndex?: number;
  validity?: ValidityRule;
};

export type CognitiveTaskId =
  | "matrix"
  | "number_series"
  | "letter_series"
  | "quant"
  | "rotation2d"
  | "backward_digits"
  | "corsi"
  | "symbol_match"
  | "choice_rt"
  | "learning_rate"
  | "balloon"
  | "delay_discount";

export type BlockKind = "questionnaire" | "qsort" | "sjt" | "ideas" | "mixed" | "task" | "env_check" | "effort";

export type Block = {
  id: string;
  kind: BlockKind;
  module: string;
  title: string;
  /** Instruction shown above every item in the block (the file's response_format.stem). */
  stem?: string;
  /** Display prefix for statement items ("I"), from the file's item_stem_prefix. */
  prefix?: string;
  status: ItemStatus;
  items: BankItem[];
};

export type SessionId = "S1" | "S2" | "S3" | "S4" | "S5";

export type SessionPlan = {
  id: SessionId;
  title: string;
  minutes: number;
  unlocks: string;
  blocks: Block[];
};
