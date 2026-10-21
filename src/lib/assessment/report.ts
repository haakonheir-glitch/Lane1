/** Plain-language report text generated from scores. Wording stays tentative on purpose. */
import type { RiasecKey, TraitKey } from "../types";
import type { ProfileScores } from "./scoring";

export const riasecLabel: Record<RiasecKey, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

const riasecGloss: Record<RiasecKey, string> = {
  R: "hands-on, practical work",
  I: "analysing and figuring things out",
  A: "making and expressing original things",
  S: "helping, teaching and supporting people",
  E: "persuading, leading and selling",
  C: "organising, ordering and checking",
};

export const traitLabel: Record<TraitKey, string> = {
  openness: "Openness",
  conscientiousness: "Conscientiousness",
  extraversion: "Extraversion",
  agreeableness: "Agreeableness",
  neuroticism: "Neuroticism",
};

const interpretations: Record<TraitKey, [low: string, mid: string, high: string]> = {
  openness: [
    "Prefers proven methods and concrete problems over abstract ones.",
    "Open to new ideas when they have a clear use.",
    "Seeks novelty and ideas; tolerates ambiguity well.",
  ],
  conscientiousness: [
    "Works in bursts; external structure and deadlines help a lot.",
    "Organised when it matters; benefits from external deadlines.",
    "Plans ahead and follows through, even on dull tasks.",
  ],
  extraversion: [
    "Recharges alone; likely does best work with fewer interruptions.",
    "Comfortable with people, and also with stretches of solo work.",
    "Gains energy from people; comfortable initiating contact.",
  ],
  agreeableness: [
    "Direct and comfortable with conflict; may come across as blunt.",
    "Cooperative, without avoiding disagreement.",
    "Warm and cooperative; may find hard negotiations draining.",
  ],
  neuroticism: [
    "Below-average reactivity to stress and setbacks.",
    "Typical reactions to stress; setbacks sting but pass.",
    "Feels setbacks and pressure strongly; recovery routines matter.",
  ],
};

export function interpret(trait: TraitKey, value: number) {
  const [lo, mid, hi] = interpretations[trait];
  return value < 40 ? lo : value > 60 ? hi : mid;
}

const aptitudeLabel: Record<string, string> = {
  verbal: "verbal reasoning",
  numerical: "numerical reasoning",
  pattern: "pattern reasoning",
  speed: "processing speed",
};

export function summarise(scores: ProfileScores): string[] {
  const out: string[] = [];
  const r = Object.entries(scores.riasec).sort((a, b) => b[1].value - a[1].value) as [RiasecKey, { value: number }][];
  if (r.length === 6) {
    const [a, b] = r;
    const low = r[r.length - 1]!;
    out.push(
      `Your interests lean most toward ${riasecGloss[a![0]]} and ${riasecGloss[b![0]]} (${riasecLabel[a![0]]} and ${riasecLabel[b![0]]}), with ${riasecGloss[low[0]]} as your weakest interest.`,
    );
  }
  const t = scores.traits;
  if (Object.keys(t).length === 5) {
    const highs = (Object.keys(t) as TraitKey[]).filter((k) => k !== "neuroticism" && t[k]!.value > 60).map((k) => traitLabel[k].toLowerCase());
    const lows = (Object.keys(t) as TraitKey[]).filter((k) => k !== "neuroticism" && t[k]!.value < 40).map((k) => traitLabel[k].toLowerCase());
    const n = t.neuroticism!.value;
    const parts: string[] = [];
    if (highs.length) parts.push(`higher on ${list(highs)}`);
    if (lows.length) parts.push(`lower on ${list(lows)}`);
    const stress = n < 40 ? "and setbacks tend not to linger" : n > 60 ? "and you may feel pressure and setbacks more than most" : "with typical reactions to stress";
    out.push(parts.length ? `You describe yourself as ${parts.join(" and ")}, ${stress}.` : `Your personality scores sit near the middle on every trait, ${stress}.`);
  }
  const apt = Object.entries(scores.aptitudes).filter(([k]) => k !== "speed").sort((a, b) => b[1].value - a[1].value);
  if (apt.length) {
    const [best] = apt;
    const missing = ["verbal", "numerical", "pattern"].filter((k) => !(k in scores.aptitudes));
    out.push(
      `Your strongest measured reasoning area is ${aptitudeLabel[best![0]]}.` +
        (missing.length ? ` ${capitalise(list(missing.map((m) => aptitudeLabel[m]!)))} ${missing.length > 1 ? "are" : "is"} not measured yet.` : ""),
    );
  }
  if (out.length === 0) out.push("Complete the interests and personality modules to see your summary.");
  return out;
}

function list(xs: string[]) {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const LIMITATIONS = [
  "It describes tendencies, not destiny. Self-report scores shift by several points between sittings, which is why every score carries an interval.",
  "The questions are Lane's own and are still being validated. Treat scores as a structured starting point, not a measurement you can rely on alone.",
  "Rankings are relative to you. A top-ranked lane is your strongest option compared with your own other options, not a claim that you would outperform other people in it.",
  "It does not read biology. There is no genetic, DNA or brain-chemistry input, and there never will be.",
  "It cannot see circumstances: money, location, health, caring duties or luck. You have to weigh those yourself.",
];
