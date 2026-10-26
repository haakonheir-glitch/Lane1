/**
 * The Profile Mark's data and geometry. Pure and deterministic: the same scores always give
 * the same mark, and every drawn element maps to one score (see MARK_LEGEND). Reads computed
 * scores only; nothing here scores or norms anything.
 */
import type { ProfileScores } from "../scoring/profile";
import { pctBand } from "./profile";

/** RIASEC order around the dial, clockwise from the top. */
export const MARK_RIASEC = ["R", "I", "A", "S", "E", "C"] as const;
/** Personality order around the pentagon, clockwise from the top. */
export const MARK_DOMAINS = ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Neuroticism"] as const;
/** The six O*NET work values, at fixed positions on the bezel. */
export const MARK_VALUES = ["Achievement", "Independence", "Recognition", "Relationships", "Support", "Working Conditions"] as const;

export type MarkInput = {
  /** Raw sums, 10–50, in MARK_RIASEC order; null where not measured yet. */
  riasec: (number | null)[];
  /** Domain z (population when normed, else relative to the person), in MARK_DOMAINS order. */
  domains: (number | null)[];
  /** General reasoning 90% percentile band, as displayed (capped at 99). */
  reasoning: [number, number] | null;
  /** Index into MARK_VALUES of the value ranked first. */
  topValue: number | null;
};

export function markInput(p: ProfileScores): MarkInput {
  const byCode = new Map(p.interests?.scales.map((s) => [s.code, s.raw]) ?? []);
  const byDomain = new Map(p.personality?.domains.map((d) => [d.id, d.normed?.z ?? d.self?.z ?? null]) ?? []);
  const top = p.values?.filter((v) => v.visibility === "user").sort((a, b) => a.rank - b.rank)[0];
  const band = p.reasoning?.generalAbility?.percentileBand;
  const vi = top ? MARK_VALUES.indexOf(top.id as (typeof MARK_VALUES)[number]) : -1;
  return {
    riasec: MARK_RIASEC.map((c) => byCode.get(c) ?? null),
    domains: MARK_DOMAINS.map((d) => byDomain.get(d) ?? null),
    reasoning: band ? pctBand(band) : null,
    topValue: vi >= 0 ? vi : null,
  };
}

/* ------------------------------------------------------------------ geometry ---- */

export const MARK_VIEW = 240;
const C = MARK_VIEW / 2;
const BEZEL = 113;
const TICK_OUTER = 106;
const TICK_MAX = 31;
const GAUGE_R = 70;
const PENT_R0 = 8;
const PENT_R = 48;

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const r2 = (n: number) => Math.round(n * 100) / 100;
/** Point at radius r and angle deg (0° = top, clockwise). */
export function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r2(C + r * Math.cos(a)), r2(C + r * Math.sin(a))];
}
function arcPath(r: number, a0: number, a1: number) {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}
/** Interests on their own 10–50 range: 10 draws nothing, 50 the full tick. */
export const interestT = (raw: number) => clamp((raw - 10) / 40);
/** Personality z on −2.5…+2.5; 0 sits on the dashed reference pentagon. */
export const domainU = (z: number) => clamp((z + 2.5) / 5);
/** Reasoning gauge: 300° clockwise from 210° (0th percentile) to 150° (100th). */
export const gaugeDeg = (pct: number) => 210 + (clamp(pct, 0, 100) / 100) * 300;

export type MarkGeometry = {
  bezel: { r: number };
  /** Six sectors of nine ticks; `measured` false draws a placeholder tick. */
  ticks: { sector: number; x1: number; y1: number; x2: number; y2: number; measured: boolean }[];
  gauge: { track: string; band: string | null; mid: [number, number, number, number] };
  pentagon: { reference: string; shape: string | null };
  value: { cx: number; cy: number } | null;
};

export function markGeometry(m: MarkInput): MarkGeometry {
  const ticks: MarkGeometry["ticks"] = [];
  m.riasec.forEach((raw, i) => {
    for (let k = 0; k < 9; k++) {
      const a = i * 60 + 6 + k * 6;
      const len = raw === null ? 2 : 3 + interestT(raw) * TICK_MAX;
      const [x1, y1] = polar(TICK_OUTER, a);
      const [x2, y2] = polar(TICK_OUTER - len, a);
      ticks.push({ sector: i, x1, y1, x2, y2, measured: raw !== null });
    }
  });
  const pent = (vals: number[]) => vals.map((v, i) => polar(PENT_R0 + v * PENT_R, i * 72).join(",")).join(" ");
  const [mx0, my0] = polar(GAUGE_R - 6, gaugeDeg(50));
  const [mx1, my1] = polar(GAUGE_R + 6, gaugeDeg(50));
  const domainsKnown = m.domains.every((z) => z !== null);
  const value = m.topValue === null ? null : (([cx, cy]) => ({ cx, cy }))(polar(BEZEL, m.topValue * 60));
  return {
    bezel: { r: BEZEL },
    ticks,
    gauge: {
      track: arcPath(GAUGE_R, gaugeDeg(0), gaugeDeg(100)),
      band: m.reasoning ? arcPath(GAUGE_R, gaugeDeg(m.reasoning[0]), Math.max(gaugeDeg(m.reasoning[1]), gaugeDeg(m.reasoning[0]) + 1.5)) : null,
      mid: [mx0, my0, mx1, my1],
    },
    pentagon: { reference: pent([0.5, 0.5, 0.5, 0.5, 0.5]), shape: domainsKnown ? pent(m.domains.map((z) => domainU(z!))) : null },
    value,
  };
}

/** How to read the mark, in the order the eye meets it. */
export const MARK_LEGEND = [
  { part: "Outer ticks", reads: "Your six interest areas (R I A S E C clockwise from the top). Longer ticks mean a higher score on the 10–50 scale." },
  { part: "Inner shape", reads: "Your five personality domains (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism, clockwise). The dashed shape is your own average." },
  { part: "Arc", reads: "Your general reasoning range: the 90% band of your percentile, on a gauge from 0 to 100. The tick marks the 50th percentile." },
  { part: "Blue dot", reads: "The work value you ranked first. Its position on the rim marks which of the six it is." },
] as const;

/** A one-line description for screen readers. */
export function markLabel(m: MarkInput): string {
  const parts: string[] = [];
  const ranked = MARK_RIASEC.map((c, i) => [c, m.riasec[i]] as const).filter(([, v]) => v !== null).sort((a, b) => b[1]! - a[1]!);
  if (ranked.length) parts.push(`interests led by ${ranked.slice(0, 3).map(([c]) => c).join("")}`);
  if (m.reasoning) parts.push(`reasoning range P${m.reasoning[0]}–${m.reasoning[1]}`);
  if (m.topValue !== null) parts.push(`top value ${MARK_VALUES[m.topValue]}`);
  return `Profile mark${parts.length ? `: ${parts.join(", ")}` : ""}.`;
}
