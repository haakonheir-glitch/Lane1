/**
 * Lane Map data: the taxonomy, matched against the profile through src/lib/matching.
 * The profile is the sample until norms exist (PLAN D1/D2); the person's own experience and
 * considered lanes are real (onboarding). Server only: returns small client-safe shapes.
 */
import "server-only";
import { cache } from "react";
import { FAMILIES, LANES, LEVELS, getFamily, getLane, ladderOf, laneModes, taxonomy } from "../taxonomy";
import type { Lane, LaneId, LevelId, Role } from "../taxonomy/generated";
import { matchLanes, rankRoles, startingRoles, entryPoint, type Experience, type LaneMatch } from "../matching";
import { normalCdf, Z90 } from "../scoring/core";
import type { ProfileScores } from "../scoring/profile";
import { TAG_NOUN } from "../matching/roles";
import { planFor } from "../lanes/plans";
import type { CareerCategory, CareerPick, CareerPicks, LadderRow, LaneDetail, LaneFilterVocab, LaneRowData, NextStep, RoleRef } from "../lanes/types";
import type { Sprint } from "../types";
import type { ExperienceAnswers } from ".";
import type { ReportLane } from "../report/facts";

const roleRef = (r: Role): RoleRef => ({ id: r.id, title: r.title, level: r.level, mode: r.mode, aka: r.aka });

/** Matching is pure and costs ~205×205 pair checks, so compute it once per request. */
const matchesFor = cache((profile: ProfileScores) => new Map(matchLanes(profile, taxonomy).map((m) => [m.laneId, m])));

function toRow(lane: Lane, m: LaneMatch, exp: ExperienceAnswers): LaneRowData {
  return {
    id: lane.id,
    name: lane.name,
    familyId: lane.family,
    familyName: getFamily(lane.family)!.name,
    payoff: lane.payoff,
    entry: lane.entry,
    sprint: lane.sprint,
    modes: laneModes(lane),
    band: m.band,
    vsAverage: m.vsAverage,
    se: m.se,
    fitPayoff: m.fitPayoff,
    considering: exp.considering.some((c) => c.laneId === lane.id),
    current: exp.current?.laneId === lane.id,
  };
}

export function buildLaneMap(profile: ProfileScores, exp: ExperienceAnswers): { rows: LaneRowData[]; vocab: LaneFilterVocab } {
  const matches = matchesFor(profile);
  return {
    rows: LANES.map((l) => toRow(l, matches.get(l.id)!, exp)),
    vocab: { families: FAMILIES.map((f) => ({ id: f.id, name: f.name })) },
  };
}

const toExperience = (exp: ExperienceAnswers): Experience => ({ laneId: exp.current?.laneId, roleId: exp.current?.roleId, years: exp.current?.years });

const CORPORATE_LADDERS = new Set(["corporate", "professional_firm"]);
const OWN_PATH_LADDERS = new Set(["independent", "performer", "creator", "founder"]);
/** Corporate needs a company ladder and private employment as the main mode (politics and public health use the corporate ladder too). */
export const careerCategory = (lane: Pick<Lane, "ladder" | "modes">): CareerCategory =>
  CORPORATE_LADDERS.has(lane.ladder) && lane.modes[0] === "employed" ? "corporate" : OWN_PATH_LADDERS.has(lane.ladder) ? "own_path" : "other";

const PICKS = 5;

/**
 * The Career map's result lists: the five best-fitting career paths overall, then the next five
 * corporate and the next five non-corporate ones (not repeating the top five), each led by the specific starting role
 * that fits the person best inside it (matching/roles.ts). Order is the map's own default
 * (band, then fit relative to the person); nothing is scored here.
 */
export function buildCareerPicks(profile: ProfileScores, exp: ExperienceAnswers): CareerPicks {
  const matches = matchesFor(profile);
  const bandOrder = ["strong", "testing", "unlikely", "insufficient"];
  const ordered = LANES.map((lane) => ({ lane, m: matches.get(lane.id)! }))
    .filter((x) => x.m.band !== "insufficient")
    .sort((a, b) => bandOrder.indexOf(a.m.band) - bandOrder.indexOf(b.m.band) || (b.m.vsAverage ?? -Infinity) - (a.m.vsAverage ?? -Infinity) || a.lane.name.localeCompare(b.lane.name));
  const experience = toExperience(exp);
  const pick = ({ lane, m }: (typeof ordered)[number]): CareerPick => {
    const ranked = rankRoles(lane, profile, taxonomy, experience, 3);
    const [first, ...rest] = ranked.top;
    return {
      row: toRow(lane, m, exp),
      category: careerCategory(lane),
      role: first ? { title: first.role.title, levelLabel: taxonomy.levels[first.role.level].label, reason: first.reason } : null,
      alsoRoles: rest.map((r) => r.role.title),
      entryNote: ranked.entry.note,
      why: m.drivers.filter((d) => d.contribution > 0.01).slice(0, 3).map((d) => d.label),
    };
  };
  const top = ordered.slice(0, PICKS);
  const rest = ordered.slice(PICKS);
  return {
    overall: top.map(pick),
    corporate: rest.filter((x) => careerCategory(x.lane) === "corporate").slice(0, PICKS).map(pick),
    ownPath: rest.filter((x) => careerCategory(x.lane) === "own_path").slice(0, PICKS).map(pick),
  };
}

function ladderRows(lane: Lane, start: LevelId | null, current: LevelId | null): LadderRow[] {
  const ladder = ladderOf(lane);
  const stepText = new Map(ladder.steps.map(([level, text]) => [level, text]));
  const levels = LEVELS.filter((l) => stepText.has(l) || lane.roles.some((r) => r.level === l));
  const startIdx = start ? levels.indexOf(start) : -1;
  return levels.map((level, i) => ({
    level,
    levelLabel: taxonomy.levels[level].label,
    step: stepText.get(level) ?? null,
    roles: lane.roles.filter((r) => r.level === level).map(roleRef),
    marker: level === current ? "current" : i === startIdx ? "start" : startIdx >= 0 && i > startIdx ? "above" : "below",
  }));
}

function nextStep(lane: Lane, sprints: Sprint[]): NextStep {
  const own = sprints.find((s) => s.laneId === lane.id && s.status !== "suggested");
  const planHref = `/lanes/${lane.id}/plan`;
  if (lane.sprint === "direct") {
    if (own) return { kind: "sprint", label: own.status === "active" ? "Open your sprint" : "View your sprint", href: `/sprints/${own.id}`, detail: taxonomy.sprint.direct };
    return { kind: "sprint", label: "Plan a sprint", href: planHref, detail: taxonomy.sprint.direct };
  }
  if (lane.sprint === "simulated") {
    if (own) return { kind: "practice", label: "Open your practice tasks", href: `/sprints/${own.id}`, detail: taxonomy.sprint.simulated };
    return { kind: "practice", label: "See practice tasks", href: planHref, detail: taxonomy.sprint.simulated };
  }
  return { kind: "shadow", label: "Plan interviews and shadowing", href: planHref, detail: taxonomy.sprint.shadow };
}

export function buildLaneDetail(id: string, profile: ProfileScores, exp: ExperienceAnswers, sprints: Sprint[]): LaneDetail | null {
  const lane = getLane(id);
  if (!lane) return null;
  const m = matchesFor(profile).get(lane.id)!;
  const ranked = rankRoles(lane, profile, taxonomy, toExperience(exp));
  const half = m.se !== null ? Z90 * m.se : null;
  return {
    row: toRow(lane, m, exp),
    description: lane.description,
    riasec: lane.riasec,
    payoffText: taxonomy.payoffs[lane.payoff],
    entryText: taxonomy.entry[lane.entry],
    sprintText: taxonomy.sprint[lane.sprint],
    ladderName: ladderOf(lane).name,
    ladder: ladderRows(lane, ranked.entry.level, ranked.entry.current),
    entryNote: ranked.entry.note,
    topRoles: ranked.top.map((t) => ({ role: roleRef(t.role), reason: t.reason })),
    drivers: m.drivers.filter((d) => Math.abs(d.contribution) >= 0.01),
    unscoredTags: m.unscoredTags.map((t) => TAG_NOUN[t]),
    payoffPosition: m.vsAverage !== null ? normalCdf(m.vsAverage) : null,
    payoffRange: m.vsAverage !== null && half !== null ? [normalCdf(m.vsAverage - half), normalCdf(m.vsAverage + half)] : null,
    next: nextStep(lane, sprints),
    isco: Object.entries(lane.isco_labels).map(([code, label]) => ({ code, label })),
  };
}

/** The plan page for a lane: sprint, practice tasks or interview-and-shadow. */
export function buildLanePlan(id: string, exp: ExperienceAnswers) {
  const lane = getLane(id);
  if (!lane) return null;
  const ep = entryPoint(lane, taxonomy, toExperience(exp));
  const roles = startingRoles(lane, taxonomy, ep);
  return { lane: { id: lane.id, name: lane.name, familyName: getFamily(lane.family)!.name, sprint: lane.sprint }, plan: planFor(lane, roles.length ? roles : lane.roles.filter((r) => taxonomy.levels[r.level].track !== "mgmt")) };
}

export const laneName = (id: string) => getLane(id)?.name ?? id;

/** A sample sprint becomes "practice tasks" unless its lane allows real work (sprint = direct). */
export const withKind = (s: Omit<Sprint, "kind">): Sprint => ({ ...s, kind: getLane(s.laneId)?.sprint === "direct" ? "sprint" : "practice" });
export const isKnownLane = (id: string): id is LaneId => !!getLane(id);

/**
 * Lanes for the written report: the strongest fits (up to six), plus the lanes the person is
 * considering or works in now, whatever their band.
 */
export function reportLanes(profile: ProfileScores, exp: ExperienceAnswers): ReportLane[] {
  const matches = matchesFor(profile);
  const strong = [...matches.values()].filter((m) => m.band === "strong").sort((a, b) => (b.vsAverage ?? 0) - (a.vsAverage ?? 0)).slice(0, 6);
  const picked = new Map<string, ReportLane["listedBecause"]>(strong.map((m) => [m.laneId, "strong_fit"]));
  for (const c of exp.considering) picked.set(c.laneId, "considering");
  if (exp.current) picked.set(exp.current.laneId, "current_job");
  return [...picked].flatMap(([id, why]) => {
    const lane = getLane(id);
    const m = matches.get(id as LaneId);
    if (!lane || !m) return [];
    return [
      {
        name: lane.name,
        family: getFamily(lane.family)!.name,
        band: m.band,
        drivers: m.drivers.filter((d) => d.contribution > 0).map((d) => d.label),
        payoff: taxonomy.payoffs[lane.payoff],
        winnerTakeAll: lane.payoff === "winner_take_all",
        entry: taxonomy.entry[lane.entry],
        howToTry: taxonomy.sprint[lane.sprint],
        listedBecause: why,
      },
    ];
  });
}
