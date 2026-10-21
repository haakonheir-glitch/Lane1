import type {
  AssessmentModule,
  AssessmentModuleId,
  LikertQuestion,
  PatternCell,
  PatternItem,
  PatternShape,
} from "../types";

export const modules: AssessmentModule[] = [
  {
    id: "interests",
    title: "Interests",
    instrument: "RIASEC",
    description: "How much you would enjoy 30 everyday work activities. There are no right answers.",
    minutes: 8,
    items: 30,
    answered: 30,
    status: "complete",
  },
  {
    id: "personality",
    title: "Personality",
    instrument: "Big Five",
    description: "How well 30 short statements describe you as you generally are, not as you wish to be.",
    minutes: 10,
    items: 30,
    answered: 30,
    status: "complete",
  },
  {
    id: "cognitive",
    title: "Cognitive games",
    instrument: "3 timed tasks",
    description: "Short performance tasks. They measure how you reason under mild time pressure, not what you know.",
    minutes: 12,
    items: 3,
    answered: 2,
    status: "in-progress",
    parts: [
      { title: "Verbal analogies", status: "complete" },
      { title: "Number series", status: "complete" },
      { title: "Pattern matrices", status: "in-progress" },
    ],
  },
  {
    id: "values",
    title: "Work values",
    instrument: "Ranked importance",
    description: "What you want work to give you. Rate 12 statements by how important they are to you.",
    minutes: 4,
    items: 12,
    answered: 0,
    status: "not-started",
  },
];

const q = (id: string, prompt: string, scale: LikertQuestion["scale"]): LikertQuestion => ({ id, prompt, scale });

export const questions: Record<Exclude<AssessmentModuleId, "cognitive">, LikertQuestion[]> = {
  interests: [
    "Repair a piece of machinery",
    "Analyse why a process keeps failing",
    "Write copy for an advertisement",
    "Teach a skill to a small group",
    "Persuade a customer to try something new",
    "Keep detailed records accurate and up to date",
    "Build something with your hands from a drawing",
    "Run an experiment and interpret the result",
    "Design the look of a product or page",
    "Help someone work through a difficult decision",
    "Negotiate the terms of a deal",
    "Organise a schedule for a busy team",
    "Work outdoors with tools or equipment",
    "Read research to answer an open question",
    "Perform or present in front of an audience",
    "Mentor a newcomer through their first months",
    "Pitch an idea to people who can fund it",
    "Check a document for errors and inconsistencies",
    "Fix an electrical or plumbing problem",
    "Find a pattern in a large set of numbers",
    "Compose music, video or writing of your own",
    "Resolve a conflict between two people",
    "Lead a project with a hard deadline",
    "Follow a precise procedure step by step",
    "Assemble or tune a mechanical system",
    "Work out how something complex really works",
    "Come up with a name and story for a brand",
    "Care for people who are unwell or struggling",
    "Start a small business from nothing",
    "Reconcile accounts at the end of a month",
  ].map((p, i) => q(`int-${i + 1}`, p, "like")),
  personality: [
    "I start conversations with people I don't know",
    "I get chores done right away",
    "I am interested in abstract ideas",
    "I sympathise with other people's feelings",
    "I get stressed easily",
    "I enjoy being the centre of attention",
    "I make plans and stick to them",
    "I enjoy trying unfamiliar food, places and ideas",
    "I take time out for others",
    "I worry about things",
    "I feel comfortable in large groups",
    "I pay attention to details",
    "I have a vivid imagination",
    "I avoid arguments, even when I'm right",
    "My mood changes often",
    "I prefer to keep in the background",
    "I leave my belongings around",
    "I find it hard to understand abstract ideas",
    "I am not very interested in other people's problems",
    "I stay calm under pressure",
    "I talk to a lot of different people at gatherings",
    "I finish what I start",
    "I enjoy thinking about how things could be different",
    "I trust people until they give me reason not to",
    "I rarely feel low",
    "I wait for others to take the lead",
    "I do just enough work to get by",
    "I prefer routine to variety",
    "I go out of my way to help",
    "I get upset by small setbacks",
  ].map((p, i) => q(`per-${i + 1}`, p, "agree")),
  values: [
    "Deciding for myself how my work gets done",
    "A predictable salary and a secure position",
    "Seeing clear proof that I am getting better",
    "Earning well above average if I perform",
    "Different problems and people each week",
    "Working closely with people I respect",
    "Work that directly helps other people",
    "Recognition from people whose opinion I value",
    "Reasonable, regular hours",
    "Leading others and setting direction",
    "Making or creating something tangible",
    "Being among the best at what I do",
  ].map((p, i) => q(`val-${i + 1}`, p, "important")),
};

/* --------------------------------------------------------------------------
   Pattern matrices — generated from simple rules so items are verifiable.
   -------------------------------------------------------------------------- */

const SHAPES_A: PatternShape[] = ["circle", "square", "triangle"];
const SHAPES_B: PatternShape[] = ["square", "diamond", "circle"];

type Rule = (row: number, col: number) => PatternCell;

const rules: { rule: Rule; seconds: number }[] = [
  { rule: (r, c) => ({ shape: SHAPES_A[r]!, count: (c + 1) as 1 | 2 | 3, filled: false }), seconds: 30 },
  { rule: (r, c) => ({ shape: SHAPES_A[c]!, count: (r + 1) as 1 | 2 | 3, filled: r === 1 }), seconds: 30 },
  { rule: (r, c) => ({ shape: SHAPES_A[(r + c) % 3]!, count: (c + 1) as 1 | 2 | 3, filled: false }), seconds: 35 },
  { rule: (r, c) => ({ shape: SHAPES_B[c]!, count: (((r + c) % 3) + 1) as 1 | 2 | 3, filled: c === 1 }), seconds: 35 },
  { rule: (r, c) => ({ shape: SHAPES_B[(r + 2 * c) % 3]!, count: (r + 1) as 1 | 2 | 3, filled: c === 2 }), seconds: 40 },
  {
    rule: (r, c) => ({ shape: SHAPES_A[(2 * r + c) % 3]!, count: (((r + c) % 3) + 1) as 1 | 2 | 3, filled: (r + c) % 2 === 0 }),
    seconds: 45,
  },
];

function otherShape(s: PatternShape, set: PatternShape[]): PatternShape {
  const i = set.indexOf(s);
  return set[(i + 1) % set.length] ?? "diamond";
}

function nextCount(n: 1 | 2 | 3): 1 | 2 | 3 {
  return ((n % 3) + 1) as 1 | 2 | 3;
}

export const patternItems: PatternItem[] = rules.map(({ rule, seconds }, idx) => {
  const cells: PatternCell[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (!(r === 2 && c === 2)) cells.push(rule(r, c));
  const answer = rule(2, 2);
  const set = idx === 3 || idx === 4 ? SHAPES_B : SHAPES_A;
  const distractors: PatternCell[] = [
    { ...answer, shape: otherShape(answer.shape, set) },
    { ...answer, count: nextCount(answer.count) },
    { ...answer, filled: !answer.filled },
  ];
  // Deterministic placement of the answer among the options.
  const answerIndex = (idx * 3 + 1) % 4;
  const options = [...distractors];
  options.splice(answerIndex, 0, answer);
  return { id: `pm-${idx + 1}`, cells, options, answerIndex, seconds };
});
