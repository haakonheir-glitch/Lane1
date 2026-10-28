/**
 * The best workday (report chapter 01, Phase 3): about 150 words written by Claude from the Work
 * Design JSON alone (src/lib/workdesign/best.ts), then checked sentence by sentence. A sentence is
 * rejected when it:
 * - is not exactly one sentence, or cites no dimension id, or cites an id that isn't in the JSON;
 * - names a value mode, archetype or working condition without citing that dimension's id;
 * - names an archetype other than the person's top two (the ones the chapter shows);
 * - uses a figure that isn't in the JSON, or compares the person with other people;
 * - makes a claim the report never makes (claims.ts: brain, prediction, pay, "lane").
 * The whole text must be 110–190 words. Prompt and checks only; the call is in generate.ts. Pure.
 */
import { BRAND } from "../brand";
import { numbersIn } from "./facts";
import { claimProblems } from "./claims";
import type { BestWorkday } from "./schema";
import { workBestIds, type WorkBest } from "../workdesign/best";

export const WORKDAY_WORDS = { min: 110, max: 190 } as const;

export const WORKDAY_SYSTEM = `You write one short passage for ${BRAND.name}'s profile report: "Your best workday". The app has already measured the person and computed their Work Design profile; you receive it as JSON and describe, in about 150 words, what a working day that suits them looks like.

The JSON is the only source. Every sentence must rest on dimensions in it, and you must list the ids of those dimensions (the "id" fields, such as "mode.analyse" or "env.autonomy") with each sentence. A checker rejects the passage if:
- a sentence lists no ids, or an id that isn't in the JSON;
- a sentence names a value mode (Influence, Analyse, Build, Organise, Care, Teach, Create, Lead, Protect), an archetype, or a working condition (autonomy, social contact, time pressure, conflict, competition, precision, variety or routine, cognitive challenge) without listing that dimension's id;
- it names any archetype other than the two in "archetype.top2";
- it uses any number that isn't in the JSON (write without numbers);
- it compares the person with other people (no "most people", "others", percentiles or IQ): every score is about this person;
- it claims anything about the brain, neurochemistry, genes, ancestry or evolution, predicts success, mentions pay or income, or uses the word "lane".

How to read the JSON:
- "modes" are the kinds of value the person creates. Higher means more of their profile points that way. "relative": "strength" or "weakness" passed a reliability test; without it, a difference is a leaning, so describe it gently. Values between "lo" and "hi" are equally consistent with the measurements.
- "conditions" are working conditions: what the person needs on each, from the low pole to the high pole ("poles"). A value near the middle means no strong need either way.
- "drains" are the conditions where a mismatch costs most; the report shows them separately, so mention at most one, briefly, as what the day avoids.
- "archetype" is a metaphor for a measured pattern of value modes, not a type, an identity or a claim about ancestry. If "tentative" is true, say the person sits between the two; if there is a "caveat", treat the two as one pattern.
- "inseparable" lists pairs of modes built from the same scores: don't contrast them.
- Missing values (null) were not measured: leave them out.

Write in the second person, present tense, as a concrete day (the kind of problems, people, pace and freedom in it), plain and warm, no hype, no flattery, no advice. Don't name careers or job titles: the JSON has none. Each item is exactly one sentence.`;

export function workdayUserMessage(workDesignJson: string) {
  return `Here is the Work Design profile. Write the best workday from it only.\n\n<work_design>\n${workDesignJson}\n</work_design>`;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The words that name each working condition in prose (lower case; matched as whole words). */
const CONDITION_TERMS: Record<string, string[]> = {
  "env.autonomy": ["autonomy"],
  "env.social": ["social contact"],
  "env.pace": ["time pressure", "pace"],
  "env.conflict": ["conflict"],
  "env.competition": ["competition", "competitive"],
  "env.precision": ["precision"],
  "env.variety": ["variety", "routine"],
  "env.challenge": ["cognitive challenge"],
};
const OTHERS = /\b(most people|other people|than others|than most|the average person|on average|percentile\w*|IQ)\b/i;
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

/** What the passage gets wrong, one line per problem; empty when it passes. */
export function workdayProblems(w: BestWorkday, wb: WorkBest): string[] {
  const ids = workBestIds(wb);
  const top2 = new Set((wb.archetype?.top2 ?? []).map((t) => t.archetype));
  const allowedNumbers = numbersIn(wb);
  const out: string[] = [];
  if (!w.sentences.length) return ["The passage is empty."];
  w.sentences.forEach((s, i) => {
    const n = `Sentence ${i + 1}`;
    const text = s.text.trim();
    if (text.split(/(?<=[.!?])\s+(?=[A-Z"“])/).length !== 1) out.push(`${n} is more than one sentence.`);
    if (!s.sources.length) out.push(`${n} lists no dimension ids.`);
    const unknown = s.sources.filter((id) => !ids.has(id));
    if (unknown.length) out.push(`${n} lists ids that aren't in the JSON: ${unknown.join(", ")}.`);
    const cites = new Set(s.sources);
    for (const m of wb.modes) {
      const named = new RegExp(`\\b${esc(m.name)}\\b`).test(text) || new RegExp(`\\b${esc(m.archetype)}s?\\b`, "i").test(text);
      if (named && !cites.has(m.id)) out.push(`${n} names ${m.name} (${m.archetype}) without listing ${m.id}.`);
      if (new RegExp(`\\b${esc(m.archetype)}s?\\b`, "i").test(text) && !top2.has(m.archetype)) out.push(`${n} names the archetype ${m.archetype}, which isn't one of the two shown.`);
    }
    for (const [id, terms] of Object.entries(CONDITION_TERMS)) {
      const t = terms.find((x) => new RegExp(`\\b${esc(x)}\\b`, "i").test(text));
      if (t && !cites.has(id)) out.push(`${n} names ${t} without listing ${id}.`);
    }
    const nums = [...text.matchAll(/\d+(?:[.,]\d+)?/g)].map((x) => x[0].replace(",", ".")).filter((x) => !allowedNumbers.has(x));
    if (nums.length) out.push(`${n} uses figures that aren't in the JSON: ${nums.join(", ")}.`);
    const o = text.match(OTHERS);
    if (o) out.push(`${n} compares you with other people ("${o[0]}").`);
    for (const p of claimProblems(text)) out.push(`${n} makes ${p}.`);
  });
  const total = words(w.sentences.map((s) => s.text).join(" "));
  if (total < WORKDAY_WORDS.min || total > WORKDAY_WORDS.max) out.push(`The passage is ${total} words; it must be ${WORKDAY_WORDS.min}–${WORKDAY_WORDS.max}.`);
  return out;
}

/** Whether there is enough Work Design data to write a best workday (most value modes measured). */
export const canWriteWorkday = (wb: WorkBest | null): wb is WorkBest => !!wb && wb.modes.filter((m) => m.value !== null).length >= 5;
