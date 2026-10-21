import type { Profile, User } from "../types";

/** Fixed "today" for the mocked app so renders are deterministic. */
export const TODAY = "2026-10-21";

export const user: User = {
  id: "usr_7f3a91",
  name: "Ingrid Halvorsen",
  initials: "IH",
  ageRange: "25–34",
  city: "Oslo",
  situation: "Employed, considering a change",
  clarityGoal: "Whether to move toward something more independent",
  email: "ingrid.halvorsen@example.no",
  reportId: "LN-2026-0824-IH",
  memberSince: "2026-08-17",
};

export const profile: Profile = {
  userId: user.id,
  reportId: user.reportId,
  issuedOn: "2026-08-24",
  version: "Profile v1.2",
  summary: [
    "Your interests lean clearly toward persuading, organising and helping people (Enterprising and Social), with Realistic, hands-on work as your weakest interest.",
    "You score high on extraversion and openness and in the middle on conscientiousness. You are likely energised by people and novelty, and may need external structure for long solo projects.",
    "Your strongest measured aptitude is verbal reasoning. Pattern reasoning is provisional because one cognitive game is still incomplete.",
  ],
  riasec: [
    { key: "R", label: "Realistic", score: { value: 28, ci: [21, 35] } },
    { key: "I", label: "Investigative", score: { value: 61, ci: [54, 68] } },
    { key: "A", label: "Artistic", score: { value: 66, ci: [59, 73] } },
    { key: "S", label: "Social", score: { value: 72, ci: [66, 78] } },
    { key: "E", label: "Enterprising", score: { value: 81, ci: [75, 87] } },
    { key: "C", label: "Conventional", score: { value: 44, ci: [37, 51] } },
  ],
  traits: [
    {
      key: "openness",
      label: "Openness",
      score: { value: 74, ci: [68, 80], median: 50, percentile: 79 },
      interpretation: "Seeks novelty and ideas; tolerates ambiguity well.",
    },
    {
      key: "conscientiousness",
      label: "Conscientiousness",
      score: { value: 52, ci: [45, 59], median: 50, percentile: 54 },
      interpretation: "Organised when it matters; benefits from external deadlines.",
    },
    {
      key: "extraversion",
      label: "Extraversion",
      score: { value: 78, ci: [72, 84], median: 50, percentile: 84 },
      interpretation: "Gains energy from people; comfortable initiating contact.",
    },
    {
      key: "agreeableness",
      label: "Agreeableness",
      score: { value: 63, ci: [56, 70], median: 50, percentile: 66 },
      interpretation: "Warm and cooperative, without avoiding disagreement.",
    },
    {
      key: "neuroticism",
      label: "Neuroticism",
      score: { value: 38, ci: [31, 45], median: 50, percentile: 32 },
      interpretation: "Below-average reactivity to stress and setbacks.",
    },
  ],
  aptitudes: [
    {
      id: "verbal",
      label: "Verbal reasoning",
      score: { value: 76, ci: [69, 83], median: 50, percentile: 81 },
      note: "Analogies and inference from short passages.",
      complete: true,
    },
    {
      id: "numerical",
      label: "Numerical reasoning",
      score: { value: 64, ci: [56, 72], median: 50, percentile: 67 },
      note: "Number series and quantitative comparison.",
      complete: true,
    },
    {
      id: "speed",
      label: "Processing speed",
      score: { value: 70, ci: [63, 77], median: 50, percentile: 74 },
      note: "Accuracy-adjusted response time across all games.",
      complete: true,
    },
    {
      id: "pattern",
      label: "Pattern reasoning",
      score: { value: 58, ci: [44, 72], median: 50, percentile: 59 },
      note: "Provisional. 3 of 6 matrix items completed.",
      complete: false,
    },
  ],
  values: [
    { id: "autonomy", label: "Autonomy", rank: 1, weight: 0.24, description: "Deciding how and when the work gets done." },
    { id: "achievement", label: "Achievement", rank: 2, weight: 0.21, description: "Visible progress against a clear standard." },
    { id: "variety", label: "Variety", rank: 3, weight: 0.17, description: "Different problems and people from week to week." },
    { id: "relationships", label: "Relationships", rank: 4, weight: 0.14, description: "Working closely with people you respect." },
    { id: "income", label: "Income", rank: 5, weight: 0.13, description: "Earnings potential, including upside." },
    { id: "security", label: "Security", rank: 6, weight: 0.11, description: "Predictable income and employment." },
  ],
  limitations: [
    "It describes tendencies, not destiny. Self-report scores shift by several points between sittings, which is why every score carries an interval.",
    "Tests predict job performance only modestly. Interests and personality explain part of who thrives in a line of work; much of the rest only shows up when you actually do it.",
    "Rankings are relative to you. A top-ranked lane is your strongest option compared with your own other options, not a claim that you would outperform other people in it.",
    "It does not read biology. There is no genetic, DNA or brain-chemistry input, and there never will be.",
    "It cannot see circumstances: money, location, health, caring duties or luck. You have to weigh those yourself.",
  ],
};
