/**
 * Zod schemas for the assessment package. They validate only the fields the app reads;
 * anything else in the JSON passes through untouched. A malformed package fails at
 * import time (build/test), never in a user's session.
 */
import { z } from "zod";

const likertOption = z.object({ value: z.number().int(), label: z.string() });
const likertFormat = z.object({ type: z.literal("likert5"), stem: z.string(), options: z.array(likertOption).length(5) });

export const neoFile = z.object({
  item_stem_prefix: z.string(),
  response_format: likertFormat,
  acquiescence_pairs: z.object({ pairs: z.array(z.tuple([z.string(), z.string()])) }),
  items: z
    .array(
      z.object({
        id: z.string(),
        source_number: z.number().int(),
        domain: z.string(),
        facet_code: z.string(),
        facet: z.string(),
        key: z.union([z.literal(1), z.literal(-1)]),
        text: z.string(),
        administer: z.boolean(),
      }),
    )
    .length(120),
});

export const hhFile = z.object({
  response_format: likertFormat,
  items: z.array(z.object({ id: z.string(), key: z.union([z.literal(1), z.literal(-1)]), text: z.string() })).length(4),
});

export const onetIpFile = z.object({
  license: z.object({ required_attribution: z.string(), trademark_rule: z.string() }),
  response_format: likertFormat,
  items: z.array(z.object({ id: z.string(), scale: z.string(), scale_code: z.enum(["R", "I", "A", "S", "E", "C"]), text: z.string() })).length(60),
});

export const interestExtFile = z.object({
  status: z.string(),
  response_format: likertFormat,
  items: z.array(z.object({ id: z.string(), scale: z.string(), scale_code: z.string(), text: z.string() })).length(42),
});

const qsortColumns = z.array(z.object({ value: z.number().int(), label: z.string().optional() })).length(5);

export const wilFile = z.object({
  response_format: z.object({ type: z.literal("forced_q_sort"), stem: z.string(), columns: qsortColumns, cards_per_column: z.number().int() }),
  scoring: z.object({ multipliers: z.record(z.string(), z.number()) }),
  items: z.array(z.object({ id: z.string(), card: z.string(), text: z.string(), value: z.string() })).length(20),
});

export const valuesExtFile = z.object({
  status: z.string(),
  response_format: z.object({ type: z.literal("forced_q_sort"), stem: z.string(), columns: qsortColumns, cards_per_column: z.array(z.number().int()).length(5) }),
  items: z.array(z.object({ id: z.string(), value: z.string(), text: z.string() })).length(12),
});

export const dispositionsFile = z.object({
  status: z.string(),
  item_stem_prefix: z.string(),
  response_format: likertFormat,
  items: z
    .array(z.object({ id: z.string(), scale: z.string(), scale_code: z.string(), key: z.union([z.literal(1), z.literal(-1)]), text: z.string() }))
    .length(60),
});

export const sjtFile = z.object({
  status: z.string(),
  understanding_items: z.array(z.object({ id: z.string(), prompt: z.string(), question: z.string(), options: z.array(z.string()), key: z.string() })).length(12),
  management_items: z
    .array(z.object({ id: z.string(), prompt: z.string(), question: z.string(), options: z.array(z.string()), provisional_key_index: z.number().int() }))
    .length(6),
});

export const creativityFile = z.object({
  tasks: z
    .array(
      z.object({
        id: z.string(),
        type: z.string(),
        prompt: z.string(),
        seconds: z.number().int(),
        instructions: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .length(4),
});

export const questionItem = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(["single", "multi", "text", "number", "likert5", "likert7", "slider_0_100"]),
  options: z.array(z.string()).nullable().optional(),
  anchors: z.array(z.string()).optional(),
  unit: z.string().optional(),
});

export const biodataFile = z.object({ status: z.string(), items: z.array(questionItem).length(18) });

export const validityFile = z.object({
  infrequency_items: z.object({ items: z.array(z.object({ id: z.string(), text: z.string(), insert_after: z.string(), fail_if_response_gte: z.number() })) }),
  instructed_items: z.object({ items: z.array(z.object({ id: z.string(), text: z.string(), insert_after: z.string(), pass_if_response_eq: z.number() })) }),
  self_report_effort: z.object({ id: z.string(), text: z.string(), options: z.array(z.string()).length(3) }),
});

export const outcomesFile = z.object({
  current_work: z.array(questionItem),
  fit_and_wellbeing: z.array(questionItem),
  performance: z.array(questionItem),
});

export const cognitiveFile = z.object({
  general_rules: z.object({ environment_check: z.string(), rapid_guess_rule: z.string() }),
  tasks: z.array(
    z.object({
      id: z.string(),
      construct: z.string(),
      format: z.string().optional(),
      phase1_ladder: z.array(z.number().int()).optional(),
      est_minutes: z.number(),
      generator: z.string(),
    }),
  ),
});

export const manifestFile = z.object({
  sessions: z
    .array(
      z.object({
        id: z.enum(["S1", "S2", "S3", "S4", "S5"]),
        title: z.string(),
        minutes: z.number(),
        modules: z.array(z.string()),
        embedded: z.array(z.string()).optional(),
        precheck: z.string().optional(),
        after: z.string().optional(),
        unlocks: z.string(),
        end: z.string().optional(),
      }),
    )
    .length(5),
  minimum_viable_profile: z.string(),
});
export type QuestionItem = z.infer<typeof questionItem>;
