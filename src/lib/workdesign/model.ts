/**
 * Layer 2, "How you work best": the Work Design model. One config defines every dimension on
 * both sides, so the person side (from Lane's scores) and the career side (from O*NET) are
 * computed from the same definitions. See docs/WORK_DESIGN.md for the rationale of each choice.
 *
 * STATUS: provisional. Every person-side formula is Lane's own model, not a published scoring.
 * Career-side O*NET element names are the exact names in O*NET 31.0 (Work Values from 30.2, the
 * last release that has them); taxonomy/build/build_onet_profiles.py fails on any name it can't
 * find (`ONET_ELEMENTS_VERIFIED` records the release they were checked against).
 */

export const WORK_DESIGN_VERSION = "wd-0.1";

/** The O*NET release every element name below was checked against (build_onet_profiles.py fails on any it can't find). */
export const ONET_ELEMENTS_VERIFIED: { release: string; date: string } | null = { release: "O*NET 31.0 (Work Values: 30.2)", date: "2026-10-27" };

/* ------------------------------------------------------------------ person side ---- */

/**
 * The person-side scores a dimension can draw on. Ids follow the matching function's construct
 * ids where they overlap. Experimental (research) scales are deliberately absent: they run in
 * shadow mode only (lib/workdesign/shadow.ts) and never enter a dimension.
 */
export type PersonConstructId =
  | `interests.${"R" | "I" | "A" | "S" | "E" | "C"}`
  | `neo.${"Neuroticism" | "Extraversion" | "Openness" | "Agreeableness" | "Conscientiousness"}`
  | `neo.${"N" | "E" | "O" | "A" | "C"}${1 | 2 | 3 | 4 | 5 | 6}`
  | `values.${"Achievement" | "Independence" | "Recognition" | "Relationships" | "Support" | "Working Conditions"}`
  | `reasoning.${"general" | "reasoning" | "spatial" | "quantitative" | "memory" | "speed"}`
  | `behaviour.${"risk" | "patience" | "learning"}`;

/** A weighted input. `reverse` uses 100 − score ("low neuroticism"). */
export type PersonInput = { id: PersonConstructId; weight: number; reverse?: boolean };

/* ------------------------------------------------------------------ career side ---- */

/** O*NET database files (text release) the career side reads, and the scale used from each. */
export type OnetSource =
  | { file: "Work Activities"; scale: "IM" | "LV" }
  | { file: "Work Context"; scale: "CX" }
  | { file: "Work Values"; scale: "EX" }
  | { file: "Abilities"; scale: "IM" | "LV" }
  | { file: "Interests"; scale: "OI" }
  | { file: "Job Zones"; scale: "JZ" };

/**
 * One career-side input: an O*NET element by its exact name, read as a 0–100 percentile across
 * all O*NET occupations (so different files share one scale). `reverse` uses 100 − percentile.
 * `taxonomy` inputs come from Lane's own taxonomy instead of O*NET.
 */
export type CareerInput =
  | { element: string; source: OnetSource; weight: number; reverse?: boolean }
  | { taxonomy: "payoff_variance"; weight: number };

/**
 * How a mismatch costs fit in Phase 2 (person score p, career score c, both 0–100):
 * - "deficit": only c below p hurts (the work gives less than you need);
 * - "excess": only c above p hurts (the work asks more than suits you);
 * - "two_sided": any distance hurts.
 */
export type Penalty = "deficit" | "excess" | "two_sided";

export type Dimension = {
  id: string;
  name: string;
  /** What low and high mean on this dimension, in plain words. */
  poles: [string, string];
  person: PersonInput[];
  career: CareerInput[];
  /** Value modes are compared as a profile shape (Phase 2); environment dimensions use a penalty. */
  penalty?: Penalty;
  /** Value modes only: the nature archetype the mode is shown as (a metaphor for a measured pattern). */
  archetype?: string;
  note?: string;
};

const WA = (element: string, weight = 1): CareerInput => ({ element, source: { file: "Work Activities", scale: "IM" }, weight });
const WC = (element: string, weight = 1, reverse = false): CareerInput => ({ element, source: { file: "Work Context", scale: "CX" }, weight, reverse });
const WV = (element: string, weight = 1): CareerInput => ({ element, source: { file: "Work Values", scale: "EX" }, weight });
const AB = (element: string, weight = 1, scale: "IM" | "LV" = "LV"): CareerInput => ({ element, source: { file: "Abilities", scale }, weight });

/* ------------------------------------------------------------------ A. value modes ---- */

/** How you add value: nine modes, each shown as a nature archetype. Shape-compared in Phase 2. */
export const VALUE_MODES: Dimension[] = [
  {
    id: "influence",
    name: "Influence",
    archetype: "Hunter",
    poles: ["Rarely persuades or sells", "Persuading, selling and winning people over"],
    person: [
      { id: "interests.E", weight: 0.4 },
      { id: "neo.E3", weight: 0.2 },
      { id: "neo.Extraversion", weight: 0.2 },
      { id: "behaviour.risk", weight: 0.2 },
    ],
    career: [WA("Selling or Influencing Others", 2), WA("Communicating with People Outside the Organization")],
    note: "The brief's 'competition-related scores' have no validated scale yet (the competitiveness items are experimental), so the risk task stands in at a low weight.",
  },
  {
    id: "analyse",
    name: "Analyse",
    archetype: "Scout",
    poles: ["Rarely digs into information", "Finding, weighing and making sense of information"],
    person: [
      { id: "interests.I", weight: 0.45 },
      { id: "reasoning.general", weight: 0.3 },
      { id: "neo.O5", weight: 0.25 },
    ],
    career: [WA("Analyzing Data or Information", 2), WA("Getting Information"), WA("Processing Information")],
  },
  {
    id: "build",
    name: "Build",
    archetype: "Maker",
    poles: ["Rarely works with physical things", "Making, fixing and handling physical things"],
    person: [
      { id: "interests.R", weight: 0.6 },
      { id: "reasoning.spatial", weight: 0.4 },
    ],
    career: [
      WA("Handling and Moving Objects"),
      WA("Repairing and Maintaining Mechanical Equipment"),
      WA("Repairing and Maintaining Electronic Equipment"),
      WA("Drafting, Laying Out, and Specifying Technical Devices, Parts, and Equipment"),
    ],
  },
  {
    id: "organise",
    name: "Organise",
    archetype: "Gatherer",
    poles: ["Little planning or record-keeping", "Planning, ordering and keeping track"],
    person: [
      { id: "interests.C", weight: 0.5 },
      { id: "neo.C2", weight: 0.25 },
      { id: "neo.C3", weight: 0.25 },
    ],
    career: [WA("Organizing, Planning, and Prioritizing Work", 2), WA("Documenting/Recording Information"), WA("Scheduling Work and Activities")],
  },
  {
    id: "care",
    name: "Care",
    archetype: "Healer",
    poles: ["Little direct care for others", "Looking after people's wellbeing"],
    person: [
      { id: "interests.S", weight: 0.5 },
      { id: "neo.A6", weight: 0.25 },
      { id: "neo.A3", weight: 0.25 },
    ],
    career: [WA("Assisting and Caring for Others")],
    note: "Shares Social interest with Teach; the two will often not separate for one person.",
  },
  {
    id: "teach",
    name: "Teach",
    archetype: "Teacher",
    poles: ["Rarely trains or explains", "Training, coaching and developing people"],
    person: [
      { id: "interests.S", weight: 0.5 },
      { id: "neo.Extraversion", weight: 0.25 },
      { id: "neo.Openness", weight: 0.25 },
    ],
    career: [WA("Training and Teaching Others", 2), WA("Coaching and Developing Others")],
  },
  {
    id: "create",
    name: "Create",
    archetype: "Storyteller",
    poles: ["Works from existing ideas", "Inventing, designing and expressing new things"],
    person: [
      { id: "interests.A", weight: 0.5 },
      { id: "neo.O1", weight: 0.25 },
      { id: "neo.O2", weight: 0.25 },
    ],
    career: [WA("Thinking Creatively")],
  },
  {
    id: "lead",
    name: "Lead",
    archetype: "Chief",
    poles: ["Rarely directs others", "Directing people and making the call"],
    person: [
      { id: "interests.E", weight: 0.4 },
      { id: "neo.E3", weight: 0.2 },
      { id: "neo.Neuroticism", weight: 0.2, reverse: true },
      { id: "neo.C4", weight: 0.2 },
    ],
    career: [
      WA("Guiding, Directing, and Motivating Subordinates", 2),
      WA("Coordinating the Work and Activities of Others"),
      WA("Making Decisions and Solving Problems"),
    ],
    note: "Shares Enterprising interest and assertiveness with Influence; the two will often not separate for one person.",
  },
  {
    id: "protect",
    name: "Protect",
    archetype: "Guardian",
    poles: ["Rarely checks or safeguards", "Checking, inspecting and keeping things safe"],
    person: [
      { id: "interests.C", weight: 0.4 },
      { id: "neo.C3", weight: 0.2 },
      { id: "neo.C6", weight: 0.2 },
      { id: "behaviour.risk", weight: 0.2, reverse: true },
    ],
    career: [
      WA("Monitoring Processes, Materials, or Surroundings"),
      WA("Evaluating Information to Determine Compliance with Standards"),
      WA("Inspecting Equipment, Structures, or Materials"),
    ],
  },
];

/* ------------------------------------------------------------------ B. environment ---- */

/** What your best day feels like: nine environment dimensions, each with a penalty shape. */
export const ENVIRONMENT: Dimension[] = [
  {
    id: "autonomy",
    name: "Autonomy",
    poles: ["Clear direction and set procedures", "Deciding how and what to do yourself"],
    person: [
      { id: "values.Independence", weight: 0.6 },
      { id: "neo.C2", weight: 0.4, reverse: true },
    ],
    career: [WC("Freedom to Make Decisions", 2), WC("Determine Tasks, Priorities and Goals"), WV("Independence")],
    penalty: "deficit",
    note: "'Determine Tasks, Priorities and Goals' (4.C.3.b.8) is the element older releases called 'Structured versus Unstructured Work'; high = the worker sets their own tasks.",
  },
  {
    id: "social",
    name: "Social contact",
    poles: ["Mostly working alone", "With people all day"],
    person: [
      { id: "neo.Extraversion", weight: 0.4 },
      { id: "interests.S", weight: 0.3 },
      { id: "values.Relationships", weight: 0.3 },
    ],
    career: [WC("Contact With Others", 2), WC("Work With or Contribute to a Work Group or Team"), WC("Deal With External Customers or the Public in General")],
    penalty: "two_sided",
  },
  {
    id: "pace",
    name: "Pace and time pressure",
    poles: ["An even pace", "Constant deadlines"],
    person: [
      { id: "reasoning.speed", weight: 0.5 },
      { id: "neo.Neuroticism", weight: 0.5, reverse: true },
    ],
    career: [WC("Time Pressure")],
    penalty: "excess",
  },
  {
    id: "conflict",
    name: "Conflict and friction",
    poles: ["Little conflict", "Frequent conflict and difficult people"],
    person: [
      { id: "neo.Neuroticism", weight: 0.4, reverse: true },
      { id: "neo.E3", weight: 0.3 },
      { id: "neo.Agreeableness", weight: 0.3, reverse: true },
    ],
    career: [WC("Conflict Situations"), WC("Dealing With Unpleasant, Angry, or Discourteous People")],
    penalty: "excess",
  },
  {
    id: "competition",
    name: "Competition",
    poles: ["Collaborative", "Openly competitive"],
    person: [
      { id: "interests.E", weight: 0.6 },
      { id: "behaviour.risk", weight: 0.4 },
    ],
    career: [WC("Level of Competition")],
    penalty: "two_sided",
  },
  {
    id: "precision",
    name: "Precision and consequence of error",
    poles: ["Room for approximation", "Exactness matters and errors are costly"],
    person: [
      { id: "neo.Conscientiousness", weight: 0.6 },
      { id: "neo.Neuroticism", weight: 0.4, reverse: true },
    ],
    career: [WC("Importance of Being Exact or Accurate"), WC("Consequence of Error")],
    penalty: "excess",
  },
  {
    id: "variety",
    name: "Variety vs. routine",
    poles: ["Routine and repetition", "New problems all the time"],
    person: [
      { id: "neo.Openness", weight: 0.6 },
      { id: "behaviour.learning", weight: 0.4 },
    ],
    career: [WC("Importance of Repeating Same Tasks", 1, true), WA("Thinking Creatively")],
    penalty: "deficit",
  },
  {
    id: "income_variance",
    name: "Income variance",
    poles: ["Steady, predictable pay", "Uneven pay with high upside"],
    person: [
      { id: "behaviour.risk", weight: 0.5 },
      { id: "behaviour.patience", weight: 0.5 },
    ],
    career: [{ taxonomy: "payoff_variance", weight: 1 }],
    penalty: "two_sided",
    note: "Career side from Lane's taxonomy payoff curve, not O*NET (see PAYOFF_VARIANCE).",
  },
  {
    id: "challenge",
    name: "Cognitive challenge",
    poles: ["Familiar, well-defined problems", "Hard, novel problems"],
    person: [{ id: "reasoning.general", weight: 1 }],
    career: [
      { element: "Job Zone", source: { file: "Job Zones", scale: "JZ" }, weight: 2 },
      AB("Deductive Reasoning"),
      AB("Inductive Reasoning"),
      AB("Mathematical Reasoning"),
      AB("Problem Sensitivity"),
    ],
    penalty: "deficit",
    note: "Deficit means under-challenge: the work asks less than your reasoning range. Over-demand is ability fit (section C), not fulfilment.",
  },
];

/** Income variance on 0–100 from the taxonomy payoff curve (Lane's judgement; documented in WORK_DESIGN.md). */
export const PAYOFF_VARIANCE: Record<string, number> = {
  linear_high_floor: 10,
  linear: 20,
  steep: 55,
  convex: 70,
  winner_take_all: 95,
};

/* ------------------------------------------------------------------ C. ability demands ---- */

/** Reasoning areas against the O*NET abilities that demand them, each ability weighted by its Importance. */
export const ABILITY_DEMANDS: { area: "reasoning" | "quantitative" | "spatial" | "memory" | "speed"; abilities: string[] }[] = [
  { area: "reasoning", abilities: ["Deductive Reasoning", "Inductive Reasoning", "Problem Sensitivity"] },
  { area: "quantitative", abilities: ["Mathematical Reasoning", "Number Facility"] },
  { area: "spatial", abilities: ["Spatial Orientation", "Visualization"] },
  { area: "memory", abilities: ["Memorization"] },
  { area: "speed", abilities: ["Perceptual Speed", "Speed of Closure"] },
];

export const DIMENSIONS: Dimension[] = [...VALUE_MODES, ...ENVIRONMENT];

/** Every O*NET element name the model reads, by file, for verification against a download. */
export function onetElements(): { file: OnetSource["file"]; element: string }[] {
  const out = new Map<string, { file: OnetSource["file"]; element: string }>();
  for (const d of DIMENSIONS) for (const c of d.career) if ("element" in c) out.set(`${c.source.file}|${c.element}`, { file: c.source.file, element: c.element });
  for (const a of ABILITY_DEMANDS) for (const e of a.abilities) out.set(`Abilities|${e}`, { file: "Abilities", element: e });
  return [...out.values()];
}
