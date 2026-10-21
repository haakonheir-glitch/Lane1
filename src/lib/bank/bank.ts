/**
 * The assessment item bank, loaded at build time from /assessment (read-only package copy).
 *
 * - Every file is validated with Zod at import, so a malformed package fails the build.
 * - administer:false items are removed here and never reach a session.
 * - Validity items (file 12) are inserted directly after their insert_after item.
 * - No question text lives in app code: everything shown comes from these files.
 *
 * Server only: items carry scoring keys.
 */
import "server-only";
import neoRaw from "@assessment/items/01_personality_ipip_neo_120.json";
import hhRaw from "@assessment/items/02_personality_honesty_humility.json";
import onetRaw from "@assessment/items/03_interests_onet_ip_short_form.json";
import intExtRaw from "@assessment/items/04_interests_lane_extension.json";
import wilRaw from "@assessment/items/05_values_onet_work_importance.json";
import valExtRaw from "@assessment/items/06_values_lane_extension.json";
import dspRaw from "@assessment/items/07_lane_dispositions.json";
import sjtRaw from "@assessment/items/08_emotional_intelligence_sjt.json";
import creRaw from "@assessment/items/09_creativity_tasks.json";
import bioRaw from "@assessment/items/10_biodata_life_history.json";
import valRaw from "@assessment/items/12_validity_checks.json";
import outRaw from "@assessment/items/13_outcomes_followup.json";
import cogRaw from "@assessment/items/14_cognitive_battery.json";
import manifestRaw from "@assessment/battery_manifest.json";
import * as S from "./schemas";
import type { BankItem, Block, CognitiveTaskId, ItemStatus, LikertOption, ResponseFormat, SessionId, SessionPlan } from "./types";

export const neo = S.neoFile.parse(neoRaw);
export const hh = S.hhFile.parse(hhRaw);
export const onet = S.onetIpFile.parse(onetRaw);
export const interestExt = S.interestExtFile.parse(intExtRaw);
export const wil = S.wilFile.parse(wilRaw);
export const valuesExt = S.valuesExtFile.parse(valExtRaw);
export const dispositions = S.dispositionsFile.parse(dspRaw);
export const sjt = S.sjtFile.parse(sjtRaw);
export const creativity = S.creativityFile.parse(creRaw);
export const biodata = S.biodataFile.parse(bioRaw);
export const validity = S.validityFile.parse(valRaw);
export const outcomes = S.outcomesFile.parse(outRaw);
export const cognitive = S.cognitiveFile.parse(cogRaw);
export const manifest = S.manifestFile.parse(manifestRaw);

export const ONET_ATTRIBUTION = onet.license.required_attribution;

const likert = (options: LikertOption[]): ResponseFormat => ({ type: "likert5", options });

/* ------------------------------------------------------------------ items per module */

const MOD = {
  neo: "01_personality_ipip_neo_120",
  hh: "02_personality_honesty_humility",
  onet: "03_interests_onet_ip_short_form",
  intExt: "04_interests_lane_extension",
  wil: "05_values_onet_work_importance",
  valExt: "06_values_lane_extension",
  dsp: "07_lane_dispositions",
  sjt: "08_emotional_intelligence_sjt",
  cre: "09_creativity_tasks",
  bio: "10_biodata_life_history",
  val: "12_validity_checks",
  out: "13_outcomes_followup",
  cog: "14_cognitive_battery",
} as const;

const neoItems: BankItem[] = neo.items
  .filter((i) => i.administer)
  .sort((a, b) => a.source_number - b.source_number)
  .map((i) => ({
    id: i.id,
    module: MOD.neo,
    text: i.text,
    format: likert(neo.response_format.options),
    status: "validated",
    facet: i.facet_code,
    domain: i.domain,
    key: i.key,
  }));

const hhItems: BankItem[] = hh.items.map((i) => ({
  id: i.id,
  module: MOD.hh,
  text: i.text,
  format: likert(hh.response_format.options),
  status: "validated",
  scale: "HH",
  key: i.key,
}));

const onetItems: BankItem[] = onet.items.map((i) => ({
  id: i.id,
  module: MOD.onet,
  text: i.text,
  format: likert(onet.response_format.options),
  status: "validated",
  scale: i.scale_code,
  key: 1,
}));

const intExtItems: BankItem[] = interestExt.items.map((i) => ({
  id: i.id,
  module: MOD.intExt,
  text: i.text,
  format: likert(interestExt.response_format.options),
  status: "experimental",
  scale: i.scale_code,
  key: 1,
}));

const dspItems: BankItem[] = dispositions.items.map((i) => ({
  id: i.id,
  module: MOD.dsp,
  text: i.text,
  format: likert(dispositions.response_format.options),
  status: "experimental",
  scale: i.scale_code,
  key: i.key,
}));

/** Capacities per column: a number means the same for all five columns. */
function capacities(c: number | number[]) {
  return typeof c === "number" ? [c, c, c, c, c] : c;
}

const wilItem: BankItem = {
  id: "WIL_SORT",
  module: MOD.wil,
  text: wil.response_format.stem,
  status: "validated",
  format: {
    type: "forced_q_sort",
    columns: wil.response_format.columns.map((c) => ({ value: c.value, label: c.label ?? "" })),
    capacities: capacities(wil.response_format.cards_per_column),
    cards: wil.items.map((i) => ({ id: i.id, text: i.text })),
  },
};

const valExtItem: BankItem = {
  id: "LV_SORT",
  module: MOD.valExt,
  text: valuesExt.response_format.stem,
  status: "experimental",
  format: {
    type: "forced_q_sort",
    // The extension's columns carry no labels; reuse the WIL end labels for orientation.
    columns: valuesExt.response_format.columns.map((c, i) => ({ value: c.value, label: c.label ?? wil.response_format.columns[i]?.label ?? "" })),
    capacities: capacities(valuesExt.response_format.cards_per_column),
    cards: valuesExt.items.map((i) => ({ id: i.id, text: i.text })),
  },
};

const sjtItems: BankItem[] = [
  ...sjt.understanding_items.map(
    (i): BankItem => ({
      id: i.id,
      module: MOD.sjt,
      text: i.prompt,
      format: { type: "sjt", question: i.question, options: i.options },
      status: "experimental",
      scale: "understanding",
      keyIndex: i.options.indexOf(i.key),
    }),
  ),
  ...sjt.management_items.map(
    (i): BankItem => ({
      id: i.id,
      module: MOD.sjt,
      text: i.prompt,
      format: { type: "sjt", question: i.question, options: i.options },
      status: "experimental",
      scale: "management",
      keyIndex: i.provisional_key_index,
    }),
  ),
];

const ideaItems: BankItem[] = creativity.tasks.map((t) => ({
  id: t.id,
  module: MOD.cre,
  text: t.prompt,
  format: { type: "ideas", seconds: t.seconds, instructions: t.instructions },
  // AUT is an established paradigm; the applied tasks are experimental. Scoring engine is pending (D14),
  // so none of these are shown as scores yet.
  status: t.status === "experimental" ? "experimental" : "validated",
  scale: t.type,
}));

/** "(Select up to 3.)" → 3 */
function multiMax(text: string) {
  const m = /select up to (\d+)/i.exec(text);
  return m ? Number(m[1]) : undefined;
}

function questionFormat(q: S.QuestionItem): ResponseFormat {
  switch (q.type) {
    case "single":
      return { type: "single", options: q.options ?? [] };
    case "multi":
      return { type: "multi", options: q.options ?? [], max: multiMax(q.text), exclusive: (q.options ?? []).filter((o) => o === "None") };
    case "text":
      return { type: "text" };
    case "number":
      return { type: "number", unit: q.unit };
    case "slider_0_100":
      return { type: "slider_0_100" };
    case "likert5":
    case "likert7": {
      const n = q.type === "likert5" ? 5 : 7;
      // Anchors are optional in the package; unlabeled points show their number only.
      const options = Array.from({ length: n }, (_, i) => ({ value: i + 1, label: q.anchors?.[i] ?? "" }));
      return { type: q.type, options };
    }
  }
}

const bioItems: BankItem[] = biodata.items.map((q) => ({ id: q.id, module: MOD.bio, text: q.text, format: questionFormat(q), status: "experimental" }));

const outcomeItems: BankItem[] = [...outcomes.current_work, ...outcomes.fit_and_wellbeing, ...outcomes.performance].map((q) => ({
  id: q.id,
  module: MOD.out,
  text: q.text,
  format: questionFormat(q),
  // Outcome items are ground truth for the model, never shown as scores.
  status: "experimental",
}));

/* ------------------------------------------------------------------ validity insertion */

const infrequency = validity.infrequency_items.items;
const instructed = validity.instructed_items.items;

/** Returns items with file-12 validity items inserted after their anchors, using the block's response scale. */
export function withValidityItems(items: BankItem[]): BankItem[] {
  const out: BankItem[] = [];
  for (const item of items) {
    out.push(item);
    for (const v of infrequency.filter((x) => x.insert_after === item.id))
      out.push({ id: v.id, module: MOD.val, text: v.text, format: item.format, status: "validated", validity: { kind: "infrequency", failIfGte: v.fail_if_response_gte } });
    for (const v of instructed.filter((x) => x.insert_after === item.id))
      out.push({ id: v.id, module: MOD.val, text: v.text, format: item.format, status: "validated", validity: { kind: "instructed", passIfEq: v.pass_if_response_eq } });
  }
  return out;
}

export const effortItem: BankItem = {
  id: validity.self_report_effort.id,
  module: MOD.val,
  text: validity.self_report_effort.text,
  format: { type: "single", options: validity.self_report_effort.options },
  status: "validated",
  validity: { kind: "effort" },
};

/** Environment-check questions, parsed from 14.general_rules.environment_check ("ask: a? b? c?"). */
export const environmentQuestions: string[] = (() => {
  const text = cognitive.general_rules.environment_check;
  const after = text.split(/ask:/i)[1] ?? "";
  return (after.match(/[^?]+\?/g) ?? [])
    .map((q) => q.trim())
    .filter((q) => !/^if not/i.test(q))
    .slice(0, 3)
    .map((q) => q.charAt(0).toUpperCase() + q.slice(1));
})();

/* ------------------------------------------------------------------ blocks */

const BLOCK_TITLES: Record<string, string> = {
  [MOD.neo]: "Personality",
  [MOD.hh]: "Honesty and humility",
  [MOD.onet]: "Interests",
  [MOD.intExt]: "More interests",
  [MOD.wil]: "Work values",
  [MOD.valExt]: "More values",
  [MOD.dsp]: "How you work",
  [MOD.sjt]: "Emotions at work",
  [MOD.cre]: "Ideas",
  [MOD.bio]: "Your history",
  [MOD.out]: "Where you are now",
};

function moduleStatus(items: BankItem[]): ItemStatus {
  return items.every((i) => i.status === "validated") ? "validated" : "experimental";
}

function blockFor(moduleRef: string): Block {
  const [file, sub] = moduleRef.split(":");
  switch (file) {
    case MOD.neo:
      return { id: file, kind: "questionnaire", module: file, title: BLOCK_TITLES[file]!, stem: neo.response_format.stem, prefix: "I", status: "validated", items: withValidityItems(neoItems) };
    case MOD.hh:
      return { id: file, kind: "questionnaire", module: file, title: BLOCK_TITLES[file]!, stem: hh.response_format.stem, prefix: "I", status: "validated", items: hhItems };
    case MOD.onet:
      return { id: file, kind: "questionnaire", module: file, title: BLOCK_TITLES[file]!, stem: onet.response_format.stem, status: "validated", items: withValidityItems(onetItems) };
    case MOD.intExt:
      return { id: file, kind: "questionnaire", module: file, title: BLOCK_TITLES[file]!, stem: interestExt.response_format.stem, status: "experimental", items: intExtItems };
    case MOD.wil:
      return { id: file, kind: "qsort", module: file, title: BLOCK_TITLES[file]!, stem: wil.response_format.stem, status: "validated", items: [wilItem] };
    case MOD.valExt:
      return { id: file, kind: "qsort", module: file, title: BLOCK_TITLES[file]!, stem: valuesExt.response_format.stem, status: "experimental", items: [valExtItem] };
    case MOD.dsp:
      return { id: file, kind: "questionnaire", module: file, title: BLOCK_TITLES[file]!, stem: dispositions.response_format.stem, prefix: "I", status: "experimental", items: withValidityItems(dspItems) };
    case MOD.sjt:
      return { id: file, kind: "sjt", module: file, title: BLOCK_TITLES[file]!, status: "experimental", items: sjtItems };
    case MOD.cre:
      return { id: file, kind: "ideas", module: file, title: BLOCK_TITLES[file]!, status: moduleStatus(ideaItems), items: ideaItems };
    case MOD.bio:
      return { id: file, kind: "mixed", module: file, title: BLOCK_TITLES[file]!, status: "experimental", items: bioItems };
    case MOD.out:
      if (sub !== "baseline") throw new Error(`Unknown outcomes block ${moduleRef}`);
      return { id: moduleRef, kind: "mixed", module: file, title: BLOCK_TITLES[file]!, status: "experimental", items: outcomeItems };
    case MOD.cog: {
      const task = cognitive.tasks.find((t) => t.id === sub);
      if (!task) throw new Error(`Unknown cognitive task ${moduleRef}`);
      return {
        id: moduleRef,
        kind: "task",
        module: file,
        title: task.construct,
        stem: task.format,
        status: "validated",
        items: [{ id: `TASK_${task.id}`, module: file, text: task.format ?? task.construct, format: { type: "task", taskId: task.id as CognitiveTaskId }, status: "validated" }],
      };
    }
    default:
      throw new Error(`Unknown module ${moduleRef}`);
  }
}

/** Expands battery_manifest.json into ordered blocks: precheck → modules → end. */
export function sessionPlan(id: SessionId): SessionPlan {
  const s = manifest.sessions.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown session ${id}`);
  const blocks: Block[] = [];
  if (s.precheck) {
    blocks.push({
      id: "env_check",
      kind: "env_check",
      module: MOD.cog,
      title: "Before you start",
      status: "validated",
      items: environmentQuestions.map((q, i) => ({ id: `ENV${i + 1}`, module: MOD.cog, text: q, format: { type: "single", options: ["Yes", "No"] }, status: "validated" })),
    });
  }
  for (const m of s.modules) blocks.push(blockFor(m));
  if (s.end) blocks.push({ id: "effort", kind: "effort", module: MOD.val, title: "One last question", status: "validated", items: [effortItem] });
  return { id: s.id, title: s.title, minutes: s.minutes, unlocks: s.unlocks, blocks };
}

export const SESSION_IDS: SessionId[] = ["S1", "S2", "S3", "S4", "S5"];

export function allSessions(): SessionPlan[] {
  return SESSION_IDS.map(sessionPlan);
}

/** Every questionnaire item by id, for marking responses. */
export const itemIndex: Map<string, BankItem> = new Map(
  allSessions()
    .flatMap((s) => s.blocks.flatMap((b) => b.items))
    .map((i) => [i.id, i]),
);

export const ACQUIESCENCE_PAIRS = neo.acquiescence_pairs.pairs;
export const WIL_MULTIPLIERS = wil.scoring.multipliers;
export const WIL_VALUE_OF: Record<string, string> = Object.fromEntries(wil.items.map((i) => [i.id, i.value]));
export const LV_SCALE_OF: Record<string, string> = Object.fromEntries(valuesExt.items.map((i) => [i.id, i.value]));
export const COGNITIVE_TASKS = cognitive.tasks;
