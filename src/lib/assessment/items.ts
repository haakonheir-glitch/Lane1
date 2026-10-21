/**
 * Lane's item bank (v1). Written for Lane: activities and statements map to the kinds of
 * work in the Lane Map, including independent and performance lanes.
 *
 * These items are new and not yet validated. Scoring is transparent (keyed means) so
 * reliability can be checked once real data exists. Do not describe them as "validated".
 */
import type { PatternCell, PatternShape, RiasecKey, TraitKey } from "../types";

export const ITEM_BANK_VERSION = "lane-items-v1";

export type LikertScale = "like" | "agree" | "important";

export type LikertItem = {
  id: string;
  prompt: string;
  scale: LikertScale;
  /** The dimension this item scores. */
  dimension: string;
  /** Reverse-keyed: a high answer means a low score on the dimension. */
  reverse?: boolean;
};

/* ----------------------------------------------------------------------------
   Interests — RIASEC, 6 activities per type, presented interleaved.
   ---------------------------------------------------------------------------- */

const interestSource: Record<RiasecKey, string[]> = {
  R: [
    "Repair or rebuild a piece of equipment",
    "Build something physical from a plan",
    "Work outdoors with tools or machinery",
    "Install or wire a system so it runs reliably",
    "Train your body to perform a physical skill at a high level",
    "Make something by hand to a precise standard",
  ],
  I: [
    "Figure out why a process keeps failing",
    "Analyse data to answer an open question",
    "Read research to settle a disagreement",
    "Design an experiment to test an idea",
    "Work out how a complex system really works",
    "Spot a pattern in markets, numbers or behaviour",
  ],
  A: [
    "Write something original for an audience",
    "Make a short video, song or design of your own",
    "Come up with a name and story for a brand",
    "Perform or present your own material",
    "Rework something until it looks or sounds exactly right",
    "Develop a recognisable personal style in your work",
  ],
  S: [
    "Teach a skill to a small group",
    "Help someone work through a difficult decision",
    "Coach a person toward a goal they set",
    "Listen to a customer's problem and help solve it",
    "Mentor a newcomer through their first months",
    "Resolve a conflict between two people",
  ],
  E: [
    "Persuade a stranger to try something new",
    "Negotiate the terms of a deal",
    "Pitch an idea to people who can fund it",
    "Start something from nothing and make it pay",
    "Lead a team toward a hard target",
    "Compete for a result where the scoreboard is public",
  ],
  C: [
    "Keep detailed records accurate and up to date",
    "Build a spreadsheet that other people rely on",
    "Follow a precise procedure step by step",
    "Check a document for errors and inconsistencies",
    "Organise a schedule for a busy team",
    "Reconcile accounts at the end of a month",
  ],
};

const RIASEC_ORDER: RiasecKey[] = ["R", "I", "A", "S", "E", "C"];

function interleave<T>(groups: T[][]): T[] {
  const out: T[] = [];
  const max = Math.max(...groups.map((g) => g.length));
  for (let i = 0; i < max; i++) for (const g of groups) if (g[i] !== undefined) out.push(g[i]!);
  return out;
}

export const interestItems: LikertItem[] = interleave(
  RIASEC_ORDER.map((k) =>
    interestSource[k].map((prompt, i) => ({ id: `int-${k}${i + 1}`, prompt, scale: "like" as const, dimension: k })),
  ),
);

/* ----------------------------------------------------------------------------
   Personality — Big Five, 8 statements per trait (4 forward, 4 reverse-keyed).
   ---------------------------------------------------------------------------- */

const personalitySource: Record<TraitKey, { plus: string[]; minus: string[] }> = {
  openness: {
    plus: [
      "I enjoy thinking about ideas that have no practical use yet",
      "I like trying unfamiliar ways of doing things",
      "I'm drawn to art, music or writing that challenges me",
      "I often imagine how things could be done differently",
    ],
    minus: [
      "I prefer to stick with methods I know work",
      "I find abstract discussions tedious",
      "I'm happiest when work follows a familiar routine",
      "I rarely go looking for new ideas outside my field",
    ],
  },
  conscientiousness: {
    plus: [
      "I finish what I start, even when it gets dull",
      "I plan my week before it begins",
      "I keep my commitments, even small ones",
      "I notice details other people miss",
    ],
    minus: [
      "I leave tasks until the last minute",
      "My workspace tends to be disorganised",
      "I lose track of things I said I would do",
      "I start more projects than I finish",
    ],
  },
  extraversion: {
    plus: [
      "I start conversations with people I don't know",
      "I feel energised after a day full of people",
      "I'm comfortable being the centre of attention",
      "I speak up quickly in group discussions",
    ],
    minus: [
      "I need time alone to recharge after social events",
      "I prefer to work behind the scenes",
      "Small talk with strangers drains me",
      "I wait for others to take the lead",
    ],
  },
  agreeableness: {
    plus: [
      "I go out of my way to help colleagues",
      "I assume people mean well until shown otherwise",
      "I care how others feel after a disagreement",
      "I'd rather cooperate than compete",
    ],
    minus: [
      "I can be blunt to the point of hurting people",
      "Results matter more to me than people's feelings",
      "I enjoy winning an argument",
      "I'm sceptical of other people's motives",
    ],
  },
  neuroticism: {
    plus: [
      "I worry about things that might go wrong",
      "Setbacks stay with me for days",
      "Tight deadlines make me tense",
      "Criticism affects my mood for a long time",
    ],
    minus: [
      "I stay calm when plans fall apart",
      "I recover quickly from rejection",
      "I rarely feel anxious about work",
      "I can take a risk without losing sleep over it",
    ],
  },
};

const TRAIT_ORDER: TraitKey[] = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"];

export const personalityItems: LikertItem[] = interleave(
  TRAIT_ORDER.map((t) => {
    const { plus, minus } = personalitySource[t];
    // Alternate forward and reverse items within each trait.
    return interleave([
      plus.map((prompt, i) => ({ id: `per-${t.slice(0, 3)}${i + 1}`, prompt, scale: "agree" as const, dimension: t })),
      minus.map((prompt, i) => ({ id: `per-${t.slice(0, 3)}${i + 5}`, prompt, scale: "agree" as const, dimension: t, reverse: true })),
    ]);
  }),
);

/* ----------------------------------------------------------------------------
   Work values — 8 values, 2 statements each.
   ---------------------------------------------------------------------------- */

export const VALUE_DEFS = [
  { id: "autonomy", label: "Autonomy", description: "Deciding how and when the work gets done.", items: ["Deciding for myself how my work gets done", "Not having anyone checking my hours"] },
  { id: "achievement", label: "Achievement", description: "Visible progress against a clear standard.", items: ["Seeing clear proof that I'm getting better", "Being among the best at what I do"] },
  { id: "variety", label: "Variety", description: "Different problems and people from week to week.", items: ["Different problems and people each week", "Rarely doing the same day twice"] },
  { id: "relationships", label: "Relationships", description: "Working closely with people you respect.", items: ["Working closely with people I respect", "Being part of a tight team"] },
  { id: "income", label: "Income", description: "Earnings potential, including upside.", items: ["Earning well above average if I perform", "Having real upside, even if it's uncertain"] },
  { id: "security", label: "Security", description: "Predictable income and employment.", items: ["A predictable salary and a stable position", "Knowing what my income will be next year"] },
  { id: "impact", label: "Impact", description: "Seeing your work make a difference to someone.", items: ["Work that directly helps other people", "Seeing the difference my work makes to someone"] },
  { id: "recognition", label: "Recognition", description: "Credit and visibility for what you make.", items: ["Recognition from people whose opinion I value", "Having my name attached to what I make"] },
] as const;

export type ValueId = (typeof VALUE_DEFS)[number]["id"];

export const valueItems: LikertItem[] = interleave(
  VALUE_DEFS.map((v) => v.items.map((prompt, i) => ({ id: `val-${v.id}${i + 1}`, prompt, scale: "important" as const, dimension: v.id }))),
);

export const likertModules = {
  interests: interestItems,
  personality: personalityItems,
  values: valueItems,
} as const;

export type LikertModuleId = keyof typeof likertModules;

/* ----------------------------------------------------------------------------
   Cognitive games. Answers live only here (server side); clients receive items
   without answer keys and the server marks responses.
   ---------------------------------------------------------------------------- */

export type GameId = "verbal" | "numerical" | "pattern";

export type TextGameItem = { id: string; kind: "text"; prompt: string; options: string[]; answerIndex: number; seconds: number };
export type PatternGameItem = { id: string; kind: "pattern"; cells: PatternCell[]; options: PatternCell[]; answerIndex: number; seconds: number };
export type GameItem = TextGameItem | PatternGameItem;

export const GAME_DEFS: { id: GameId; title: string; instruction: string; aptitude: string }[] = [
  { id: "verbal", title: "Verbal analogies", instruction: "Complete the analogy: the second pair should relate the same way as the first.", aptitude: "Verbal reasoning" },
  { id: "numerical", title: "Number series", instruction: "Find the number that continues the series.", aptitude: "Numerical reasoning" },
  { id: "pattern", title: "Pattern matrices", instruction: "Each grid follows a rule across its rows and columns. Choose the option that completes it.", aptitude: "Pattern reasoning" },
];

const verbal: [string, string[], number][] = [
  ["Seed is to tree as egg is to …", ["Nest", "Bird", "Shell", "Feather"], 1],
  ["Thermometer is to temperature as clock is to …", ["Hour", "Wall", "Time", "Alarm"], 2],
  ["Author is to novel as composer is to …", ["Symphony", "Orchestra", "Piano", "Concert"], 0],
  ["Draft is to final copy as rehearsal is to …", ["Stage", "Script", "Actor", "Performance"], 3],
  ["Scarce is to abundant as brief is to …", ["Short", "Lengthy", "Concise", "Quick"], 1],
  ["Prologue is to novel as overture is to …", ["Curtain", "Applause", "Opera", "Ending"], 2],
  ["Cautious is to reckless as frugal is to …", ["Wasteful", "Thrifty", "Poor", "Careful"], 0],
  ["Map is to territory as score is to …", ["Points", "Composer", "Paper", "Music"], 3],
];

const numerical: [string, number[], number][] = [
  ["2, 4, 8, 16, …", [24, 30, 32, 36], 2],
  ["3, 7, 11, 15, …", [17, 19, 18, 21], 1],
  ["1, 4, 9, 16, …", [25, 20, 24, 36], 0],
  ["2, 3, 5, 8, 13, …", [18, 20, 26, 21], 3],
  ["81, 27, 9, 3, …", [0, 2, 1, 3], 2],
  ["5, 6, 8, 11, 15, …", [20, 18, 19, 21], 0],
  ["2, 6, 3, 9, 6, 18, …", [12, 54, 21, 15], 3],
  ["1, 1, 2, 6, 24, …", [48, 120, 96, 144], 1],
];

/* Pattern matrices — generated from simple rules so every item is verifiable. */
const SHAPES_A: PatternShape[] = ["circle", "square", "triangle"];
const SHAPES_B: PatternShape[] = ["square", "diamond", "circle"];
type Rule = (row: number, col: number) => PatternCell;
const c3 = (n: number) => (((n % 3) + 3) % 3 + 1) as 1 | 2 | 3;

const patternRules: { rule: Rule; set: PatternShape[]; seconds: number }[] = [
  { rule: (r, c) => ({ shape: SHAPES_A[r]!, count: c3(c), filled: false }), set: SHAPES_A, seconds: 30 },
  { rule: (r, c) => ({ shape: SHAPES_A[c]!, count: c3(r), filled: r === 1 }), set: SHAPES_A, seconds: 30 },
  { rule: (r, c) => ({ shape: SHAPES_A[(r + c) % 3]!, count: c3(c), filled: false }), set: SHAPES_A, seconds: 35 },
  { rule: (r, c) => ({ shape: SHAPES_B[c]!, count: c3(r + c), filled: c === 1 }), set: SHAPES_B, seconds: 35 },
  { rule: (r, c) => ({ shape: SHAPES_B[(r + 2 * c) % 3]!, count: c3(r), filled: c === 2 }), set: SHAPES_B, seconds: 40 },
  { rule: (r, c) => ({ shape: SHAPES_A[(2 * r + c) % 3]!, count: c3(r + c), filled: (r + c) % 2 === 0 }), set: SHAPES_A, seconds: 45 },
  { rule: (r, c) => ({ shape: SHAPES_B[(r + c) % 3]!, count: c3(2 * r + c), filled: r === c }), set: SHAPES_B, seconds: 45 },
  { rule: (r, c) => ({ shape: SHAPES_A[(c + 2 * r) % 3]!, count: c3(r + 2 * c), filled: (r * c) % 2 === 1 }), set: SHAPES_A, seconds: 50 },
];

const pattern: PatternGameItem[] = patternRules.map(({ rule, set, seconds }, idx) => {
  const cells: PatternCell[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (!(r === 2 && c === 2)) cells.push(rule(r, c));
  const answer = rule(2, 2);
  const other = set[(set.indexOf(answer.shape) + 1) % set.length]!;
  const distractors: PatternCell[] = [
    { ...answer, shape: other },
    { ...answer, count: c3(answer.count) },
    { ...answer, filled: !answer.filled },
  ];
  const answerIndex = (idx * 3 + 1) % 4;
  const options = [...distractors];
  options.splice(answerIndex, 0, answer);
  return { id: `pat-${idx + 1}`, kind: "pattern", cells, options, answerIndex, seconds };
});

export const gameItems: Record<GameId, GameItem[]> = {
  verbal: verbal.map(([prompt, options, answerIndex], i) => ({ id: `vrb-${i + 1}`, kind: "text", prompt, options, answerIndex, seconds: 25 })),
  numerical: numerical.map(([prompt, options, answerIndex], i) => ({
    id: `num-${i + 1}`,
    kind: "text",
    prompt,
    options: options.map(String),
    answerIndex,
    seconds: 35,
  })),
  pattern,
};

/** Items as sent to the browser: no answer keys. */
export type PublicGameItem =
  | Omit<TextGameItem, "answerIndex">
  | Omit<PatternGameItem, "answerIndex">;

export function publicItems(game: GameId): PublicGameItem[] {
  return gameItems[game].map((item) => {
    const { answerIndex, ...rest } = item;
    void answerIndex;
    return rest;
  });
}

export function findGameItem(itemId: string): { game: GameId; item: GameItem } | undefined {
  for (const game of Object.keys(gameItems) as GameId[]) {
    const item = gameItems[game].find((i) => i.id === itemId);
    if (item) return { game, item };
  }
  return undefined;
}
