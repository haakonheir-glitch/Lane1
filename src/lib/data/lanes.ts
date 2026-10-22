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
import type { LadderRow, LaneDetail, LaneFilterVocab, LaneRowData, NextStep, RoleRef } from "../lanes/types";
import type { Sprint } from "../types";
import type { ExperienceAnswers } from ".";

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
