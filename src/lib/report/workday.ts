/**
 * The best workday (report chapter 01, Phase 3): about 150 words written by Claude from the Work
 * Design JSON alone (src/lib/workdesign/best.ts), then checked sentence by sentence. A sentence is
 * rejected when it:
 * - is not exactly one sentence, or cites no dimension id, an id that isn't in the JSON, or one
 *   that wasn't measured;
 * - names a value mode (any form of its verb: "leading", "analysed"), archetype or working condition
 *   without citing that dimension's id;
 * - names an archetype other than the person's top two (the ones the chapter shows);
 * - names a career path or job title (the JSON has none);
 * - uses a figure that isn't in the JSON (digits, or large numbers and percentages in words), or
 *   compares the person with other people;
 * - makes a claim the report never makes (claims.ts: brain, prediction, pay, "lane").
 * The whole text must be 110–190 words. Prompt and checks only; the call is in generate.ts. Pure.
 */
import { BRAND } from "../brand";
import { numbersIn } from "./facts";
import { claimProblems } from "./claims";
import type { BestWorkday } from "./schema";
import { workBestIds, type WorkBest } from "../workdesign/best";
import { LANES } from "../taxonomy";

export const WORKDAY_WORDS = { min: 110, max: 190 } as const;

export const WORKDAY_SYSTEM = `You write one short passage for ${BRAND.name}'s profile report: "Your best workday". The app has already measured the person and computed their Work Design profile; you receive it as JSON and describe, in 120–180 words (the checker allows 110–190), what a working day that suits them looks like.

The JSON is the only source. Every sentence must rest on dimensions in it, and you must list the ids of those dimensions (the "id" fields, such as "mode.analyse" or "env.autonomy") with each sentence. A checker rejects the passage if:
- a sentence lists no ids, or an id that isn't in the JSON;
- a sentence lists the id of a dimension whose value is null (not measured);
- a sentence names a value mode (Influence, Analysis, Building, Organising, Caring, Teaching, Creating, Leadership or Leading, Protecting, capitalised or not) or an archetype name (capitalised: Hunter, Scout, Maker, Gatherer, Healer, Teacher, Storyteller, Chief, Guardian) without listing that mode's id;
- a sentence names a working condition without listing its id: autonomy; social contact; time pressure or deadlines; conflict; competition; precision; variety or routine; cognitive challenge;
- it names any archetype other than the two in "archetype.top2";
- it names a career, job title or workplace ("as a nurse", "work as an engineer", "a career in sales", "at a startup", "CEO"): the JSON has none;
- it uses any number that isn't in the JSON, including large numbers and percentages in words (write without numbers);
- it compares the person with other people ("most people", "than others", "anyone else", "your peers", percentiles, IQ): every score is about this person;
- it claims anything about the brain, neurochemistry, hormones, genes, biology, instinct of birth ("born to", "innate"), ancestry, tribes or evolution; predicts success ("you'll thrive", "likely to excel"); mentions pay, money, bonuses or commission; or uses the word "lane".

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
/**
 * The words that name each value mode as a mode (nouns and "-ing" forms of the activity), matched
 * case-insensitively. Plain verbs ("lead to", "care about", "build trust", "create space") are
 * everyday English and aren't counted.
 */
const MODE_TERMS: Record<string, RegExp> = {
  "mode.influence": /\binfluenc(?:e|ing)\b/i,
  "mode.analyse": /\b(?:analysis|analys[ei]s|analysing|analyzing|analytical)\b/i,
  "mode.build": /\bbuilding things\b|\bmaking things\b|\bbuild mode\b/i,
  "mode.organise": /\borganis(?:ing|ation)\b|\borganiz(?:ing|ation)\b/i,
  "mode.care": /\bcaring for\b|\blooking after (?:people|others)\b/i,
  "mode.teach": /\bteaching\b/i,
  "mode.create": /\bcreating\b|\bcreativity\b|\binventing\b/i,
  "mode.lead": /\bleadership\b|\bleading (?:a |the |your )?(?:\w+ )?(?:people|others|team|teams|group|groups|meeting|room|project)\b/i,
  "mode.protect": /\bprotecting\b|\bsafeguarding\b/i,
};
/** The words that name each working condition, matched case-insensitively. */
const CONDITION_TERMS: Record<string, RegExp> = {
  "env.autonomy": /\bautonom\w*/i,
  "env.social": /\bsocial contact\b/i,
  "env.pace": /\b(?:time pressure|deadlines?)\b/i,
  "env.conflict": /\bconflicts?\b/i,
  "env.competition": /\bcompetition\b/i,
  "env.precision": /\bprecision\b/i,
  "env.variety": /\b(?:variety|routines?)\b/i,
  "env.challenge": /\bcognitive challenge\w*/i,
};
const OTHERS = /\b(most people|than other people|than others|than most|the average person|on average|anyone else|your peers|few people|the majority|unlike others|percentile\w*|IQ)\b/i;
const NUMBER_WORDS = /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundreds?|thousands?|percent|per cent)\b/i;

/**
 * Career path names and role titles from the taxonomy (the JSON has none, so naming one adds a
 * fact). Titles are split on "/", "," and "(" so "Chief executive officer (CEO)" gives both
 * parts. Several-word titles match anywhere. One-word titles and the head nouns of longer ones
 * ("registered nurse" → "nurse") match only when the sentence casts the person in the job: "as a
 * (senior) nurse", "work as …", "a career in …". A few common titles that aren't in that form are
 * listed by hand. Role-in-the-room words ("a guide", "the host") pass.
 */
let titleRe: RegExp | null = null;
function titles(): RegExp {
  if (titleRe) return titleRe;
  const archetypes = new Set(["hunter", "scout", "maker", "gatherer", "healer", "teacher", "storyteller", "chief", "guardian"]);
  const parts = new Set<string>();
  for (const l of LANES) for (const t of [l.name, ...l.roles.map((r) => r.title)]) for (const p of t.toLowerCase().split(/\s*[/,(]\s*|\)/)) if (p.trim()) parts.add(p.trim().replace(/\s+/g, " "));
  const multi = [...parts].filter((n) => n.includes(" ") && n.length > 5 && !/^(?:the|a|an) /.test(n)).sort((a, b) => b.length - a.length).map(esc);
  const agent = /(?:er|or|ist|ian|ant|ent|man|nurse|chef|doctor|pilot|judge|clerk|cook|midwife|officer|smith|wright|ceo|cfo|cto)$/;
  const heads = new Set([...parts].map((n) => n.split(" ").pop()!.replace(/[^a-z-]/g, "")).filter((n) => n.length > 2 && agent.test(n) && !archetypes.has(n)));
  for (const h of ["ceo", "salesperson", "executive", "entrepreneur", "politician", "rep", "founder", "manager"]) heads.add(h);
  const head = [...heads].map(esc).join("|");
  titleRe = new RegExp(
    [
      `\\b(?:${multi.join("|")})\\b`,
      `\\b(?:as|work(?:s|ed|ing)? as|job as|role as|make|makes|be|become|becomes|'d be|would be)\\s+(?:a|an|the)?\\s*(?:[a-z-]+\\s+){0,2}(?:${head})s?\\b`,
      `\\b(?:a )?career (?:in|as)\\b`,
      `\\b(?:ceos?|startups?|start-ups?|trading floor|law firm|hospital ward)\\b`,
    ].join("|"),
    "i",
  );
  return titleRe;
}
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

/** What the passage gets wrong, one line per problem; empty when it passes. */
export function workdayProblems(w: BestWorkday, wb: WorkBest): string[] {
  const ids = workBestIds(wb);
  const measured = new Set([...wb.modes, ...wb.conditions].filter((d) => d.value !== null).map((d) => d.id));
  const top2 = new Set((wb.archetype?.top2 ?? []).map((t) => t.archetype));
  const allowedNumbers = numbersIn(wb);
  const out: string[] = [];
  if (!w.sentences.length) return ["The passage is empty."];
  w.sentences.forEach((s, i) => {
    const text = s.text.trim();
    const n = `Sentence ${i + 1} ("${text.length > 140 ? `${text.slice(0, 137)}…` : text}")`;
    if (text.split(/(?<=[.!?])\s+(?=[A-Z"“])/).length !== 1) out.push(`${n} is more than one sentence.`);
    if (!s.sources.length) out.push(`${n} lists no dimension ids.`);
    const unknown = s.sources.filter((id) => !ids.has(id));
    if (unknown.length) out.push(`${n} lists ids that aren't in the JSON: ${unknown.join(", ")}.`);
    const unmeasured = s.sources.filter((id) => ids.has(id) && !measured.has(id));
    if (unmeasured.length) out.push(`${n} relies on dimensions that weren't measured: ${unmeasured.join(", ")}.`);
    const cites = new Set(s.sources);
    for (const m of wb.modes) {
      // Archetypes as capitalised names ("Maker", not "decision-maker" or "your chief concern").
      const arche = new RegExp(`(?<![-\\w])${esc(m.archetype)}s?\\b|\\b(?:a|an|the) ${esc(m.archetype.toLowerCase())}s?\\b`).test(text);
      const word = text.match(MODE_TERMS[m.id]!)?.[0];
      if ((word || arche) && !cites.has(m.id)) out.push(`${n} uses "${word ?? m.archetype}" (${m.name}, ${m.archetype}) without listing ${m.id}: reword it, or list ${m.id} only if the sentence is about that mode.`);
      if (arche && !top2.has(m.archetype)) out.push(`${n} names the archetype ${m.archetype}, which isn't one of the two shown.`);
    }
    for (const [id, re] of Object.entries(CONDITION_TERMS)) {
      const t = text.match(re)?.[0];
      if (t && !cites.has(id)) out.push(`${n} uses "${t}" without listing ${id}: reword it, or list ${id} only if the sentence is about that condition.`);
    }
    const title = text.match(titles())?.[0];
    if (title) out.push(`${n} names a career or job title ("${title.trim()}"), which isn't in the JSON.`);
    const nums = [...text.matchAll(/\d+(?:[.,]\d+)?/g)].map((x) => x[0].replace(",", ".")).filter((x) => !allowedNumbers.has(x));
    const spelled = text.match(NUMBER_WORDS)?.[0];
    if (nums.length || spelled) out.push(`${n} uses figures that aren't in the JSON: ${[...nums, ...(spelled ? [spelled] : [])].join(", ")}.`);
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
