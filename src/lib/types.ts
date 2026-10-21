// Domain types. The single source of truth shared by mocks, data access and components.

export type Confidence = "high" | "med" | "low";

/** A 0–100 measurement with an 80% interval. */
export type Score = {
  value: number;
  ci: [number, number];
  /** Population median on the same scale, where a population comparison is meaningful. */
  median?: number;
  percentile?: number;
};

export type User = {
  id: string;
  name: string;
  initials: string;
  ageRange: string;
  city: string;
  situation: string;
  clarityGoal: string;
  email: string;
  reportId: string;
  memberSince: string;
};

export type RiasecKey = "R" | "I" | "A" | "S" | "E" | "C";
export type RiasecDimension = { key: RiasecKey; label: string; score: Score };

export type TraitKey = "openness" | "conscientiousness" | "extraversion" | "agreeableness" | "neuroticism";
export type Trait = { key: TraitKey; label: string; score: Score; interpretation: string };

export type Aptitude = { id: string; label: string; score: Score; note: string; complete: boolean };

export type WorkValue = { id: string; label: string; rank: number; weight: number; description: string };

export type Profile = {
  userId: string;
  reportId: string;
  issuedOn: string;
  version: string;
  summary: string[];
  riasec: RiasecDimension[];
  traits: Trait[];
  aptitudes: Aptitude[];
  values: WorkValue[];
  limitations: string[];
  /** Parts of the assessment not yet complete, in plain words. */
  pending: string[];
  /** Population size behind percentiles; percentiles appear only once this reaches the norm threshold. */
  normN: number;
};

export type LaneGroup = "corporate" | "independent" | "performance" | "craft";
export type PayoffType = "linear" | "convex" | "winner-take-all";

export type LaneDriver = { label: string; contribution: number };

export type Lane = {
  id: string;
  name: string;
  group: LaneGroup;
  payoff: PayoffType;
  summary: string;
  /** Ipsative fit: relative to the user's own spread of scores, not to other people. */
  relativeFit: Score;
  /** Estimated position on the payoff curve at a realistic skill level (0–1 percentile). */
  payoffPosition: number;
  payoffPositionCi: [number, number];
  confidence: Confidence;
  drivers: LaneDriver[];
  /** Other people who completed a sprint in this lane, and the share who wanted to continue. */
  similar: { n: number; continuedPct: number | null };
};

export type RankedLane = Lane & {
  rank: number;
  tied: boolean;
  expectedPayoff: number;
  /** The score used for the active sort, 0–100. */
  sortScore: Score;
};

export type LaneSort = "fit" | "fit-payoff";

export type AssessmentModuleId = "interests" | "personality" | "cognitive" | "values";
export type ModuleStatus = "complete" | "in-progress" | "not-started";

export type OnboardingAnswers = { ageRange: string | null; situation: string | null; clarityGoal: string | null };

export type AssessmentModule = {
  id: AssessmentModuleId;
  title: string;
  instrument: string;
  description: string;
  minutes: number;
  items: number;
  answered: number;
  status: ModuleStatus;
  parts?: { title: string; status: ModuleStatus }[];
};

export type LikertQuestion = {
  id: string;
  prompt: string;
  /** Left / right anchors for the 1–5 scale. */
  scale: "agree" | "like" | "important";
};

export type PatternShape = "circle" | "square" | "triangle" | "diamond";
export type PatternCell = { shape: PatternShape; count: 1 | 2 | 3; filled: boolean };
export type PatternItem = {
  id: string;
  cells: PatternCell[]; // 8 cells, row-major; the 9th is missing
  options: PatternCell[];
  answerIndex: number;
  seconds: number;
};

export type SprintStatus = "active" | "completed" | "suggested";

export type SprintTask = { day: number; title: string; detail: string; done: boolean };
export type CheckIn = { day: number; energy: number; flow: number; continue: number };
export type LogEntry = { day: number; values: Record<string, number>; note?: string };

export type SprintMetric = { key: string; label: string; unit: string };

export type SprintOutcome = {
  /** Percentile against others who ran the same sprint; null until enough people have. */
  performance: Score | null;
  /** Percentage improvement from first to last third of the sprint; null without enough logged days. */
  improvementRate: number | null;
  energyAvg: number;
  wantsToContinue: boolean;
  summary: string;
};

export type Sprint = {
  id: string;
  templateId: string;
  laneId: string;
  title: string;
  brief: string;
  days: number;
  startedOn?: string;
  currentDay?: number;
  status: SprintStatus;
  tasks: SprintTask[];
  checkIns: CheckIn[];
  metrics: SprintMetric[];
  /** Key of the derived series plotted on the improvement chart. */
  chart: { label: string; unit: string; numerator: string; denominator?: string; scale?: number };
  log: LogEntry[];
  outcome?: SprintOutcome;
};

export type EvidenceKind = "assessment" | "sprint-start" | "sprint-end" | "check-in" | "outcome";

export type EvidenceEvent = {
  id: string;
  date: string;
  kind: EvidenceKind;
  title: string;
  detail: string;
  laneId?: string;
};

export type ConvictionSeries = {
  laneId: string;
  points: { date: string; value: number; ci: [number, number] }[];
};

export type Evidence = {
  headline: string;
  confidence: Confidence;
  events: EvidenceEvent[];
  conviction: ConvictionSeries[];
};
