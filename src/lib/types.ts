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

export type OnboardingAnswers = { ageRange: string | null; situation: string | null; clarityGoal: string | null };

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
  /** "sprint" only in lanes where the real work can be done (taxonomy sprint = direct); otherwise practice tasks. */
  kind: "sprint" | "practice";
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
