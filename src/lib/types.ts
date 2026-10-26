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

