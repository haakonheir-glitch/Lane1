/**
 * Lane cognitive & behavioural task generators.
 *
 * Every task is procedurally generated from a seed, for three reasons:
 *  1. Item exposure: a fixed public item bank gets answer keys posted online within months.
 *  2. Retesting: users can re-take the battery without remembering items.
 *  3. Licensing: no proprietary test content (Raven's, Wechsler, Wonderlic) is reproduced.
 *
 * Difficulty is controlled by explicit parameters so items can be calibrated with IRT
 * (difficulty predicted from the generator's parameters, then refined with pilot data).
 *
 * Plain TypeScript with no dependencies. Uses only erasable syntax so it runs with
 * `node --experimental-strip-types` for testing.
 */

// ------------------------------------------------------------------ seeded RNG
export type Rng = () => number;

/** Mulberry32 — small, fast, deterministic PRNG. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const randInt = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
export const pick = <T>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
export function shuffle<T>(r: Rng, xs: readonly T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ------------------------------------------------------------------ 1. Matrix reasoning (fluid reasoning, Gf)
export const SHAPES = ["circle", "square", "triangle", "pentagon", "hexagon", "arrow"] as const;
/** Shapes whose orientation is visible at every 45° step (no rotational symmetry that is a multiple of 45°).
 *  Circle, square and hexagon look identical under some 45° rotations, so rotation may only vary when
 *  every shape in the item comes from this list. */
export const ROTATION_SAFE_SHAPES = [2, 3, 5]; // triangle, pentagon, arrow
export const FILLS = ["empty", "lines", "solid"] as const;
export type Cell = { shape: number; count: number; fill: number; rotation: number }; // indices into value lists
export type Attr = keyof Cell;
export type Rule = "constant" | "progression" | "distribution3";
export const ATTR_VALUES: Record<Attr, number> = { shape: SHAPES.length, count: 5, fill: FILLS.length, rotation: 8 };
// count index i => i+1 objects; rotation index i => i*45 degrees

export type MatrixItem = {
  id: string;
  task: "matrix";
  difficulty: { activeRules: number; predictedLogit: number };
  rules: Record<Attr, Rule>;
  grid: (Cell | null)[]; // 9 cells, index 8 is the missing one (null)
  options: Cell[]; // 8 options
  answerIndex: number;
  timeLimitSec: number;
};

function ruleRows(r: Rng, rule: Rule, values: number[]): number[][] {
  // returns 3 rows x 3 columns of value indices for one attribute, drawn from `values`
  if (rule === "constant") {
    const v = pick(r, values);
    return [0, 1, 2].map(() => [v, v, v]);
  }
  if (rule === "progression") {
    const step = pick(r, [1, -1]);
    const n = values.length;
    return [0, 1, 2].map(() => {
      const start = step > 0 ? randInt(r, 0, n - 3) : randInt(r, 2, n - 1);
      return [values[start], values[start + step], values[start + 2 * step]];
    });
  }
  // distribution of three: each row is a different permutation (Latin square) of three values
  const vals = shuffle(r, values).slice(0, 3);
  const shiftDir = pick(r, [1, 2]);
  return [0, 1, 2].map((row) => [0, 1, 2].map((col) => vals[(col + row * shiftDir) % 3]));
}

/**
 * activeRules: how many attributes follow a non-constant rule (1-4). More active rules = harder.
 * Distractors use the attribute-bisection method (as in I-RAVEN): three attributes are chosen,
 * each gets the correct value and one plausible wrong value, and the 8 options are all 2^3
 * combinations. Every attribute value appears in exactly half the options, so the answer cannot
 * be found by picking the most common value (a known flaw of the original RAVEN dataset).
 */
export function generateMatrix(seed: number, activeRules: 1 | 2 | 3 | 4): MatrixItem {
  const r = makeRng(seed);
  const attrs: Attr[] = ["shape", "count", "fill", "rotation"];
  const active = shuffle(r, attrs).slice(0, activeRules);
  // Rotation is "in play" if it follows a rule or will be used to build distractors.
  // Distractors bisect the active attributes first, then constant ones excluding rotation,
  // so rotation is in play exactly when it is active.
  const rotationInPlay = active.includes("rotation");
  const allValues = (a: Attr) => [...Array(ATTR_VALUES[a]).keys()];
  const valueSet = (a: Attr) => (a === "shape" && rotationInPlay ? ROTATION_SAFE_SHAPES : allValues(a));
  const rules = {} as Record<Attr, Rule>;
  const table = {} as Record<Attr, number[][]>;
  for (const a of attrs) {
    let rule: Rule = "constant";
    if (active.includes(a)) {
      const allowed: Rule[] = a === "fill" || a === "shape" ? ["distribution3"] : ["progression", "distribution3"];
      rule = pick(r, allowed);
    }
    rules[a] = rule;
    table[a] = ruleRows(r, rule, valueSet(a));
  }
  const cells: Cell[] = [];
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++)
      cells.push({ shape: table.shape[row][col], count: table.count[row][col], fill: table.fill[row][col], rotation: table.rotation[row][col] });
  const answer = cells[8];

  // pick 3 attributes to bisect: active ones first, then constant ones (never a constant rotation)
  const fillers = shuffle(r, attrs.filter((a) => !active.includes(a) && a !== "rotation"));
  const bisect = [...active, ...fillers].slice(0, 3);
  const wrong = {} as Record<Attr, number>;
  for (const a of bisect) {
    // plausible wrong value: a value that appears elsewhere in the grid, if possible
    const seen = new Set(cells.slice(0, 8).map((c) => c[a]).filter((v) => v !== answer[a]));
    const pool = seen.size ? [...seen] : valueSet(a).filter((v) => v !== answer[a]);
    wrong[a] = pick(r, pool);
  }
  const options: Cell[] = [];
  for (let mask = 0; mask < 8; mask++) {
    const c: Cell = { ...answer };
    bisect.forEach((a, i) => { if (mask & (1 << i)) c[a] = wrong[a]; });
    options.push(c);
  }
  const shuffled = shuffle(r, options);
  const answerIndex = shuffled.findIndex((c) => c === options[0]);
  return {
    id: `MAT-${activeRules}-${seed}`,
    task: "matrix",
    difficulty: { activeRules, predictedLogit: -1.5 + 1.0 * (activeRules - 1) },
    rules,
    grid: [...cells.slice(0, 8), null],
    options: shuffled,
    answerIndex,
    timeLimitSec: 45 + 15 * activeRules,
  };
}

// ------------------------------------------------------------------ 2. Number series (inductive reasoning)
export type SeriesItem = { id: string; task: "number_series" | "letter_series"; shown: (number | string)[]; answer: number | string; options: (number | string)[]; rule: string; level: number; timeLimitSec: number };

type NumRule = { name: string; level: number; make: (r: Rng) => number[] };
const NUM_RULES: NumRule[] = [
  { name: "add constant", level: 1, make: (r) => { const s = randInt(r, 1, 20), d = randInt(r, 2, 9); return [0, 1, 2, 3, 4, 5].map((i) => s + i * d); } },
  { name: "subtract constant", level: 1, make: (r) => { const s = randInt(r, 60, 99), d = randInt(r, 3, 9); return [0, 1, 2, 3, 4, 5].map((i) => s - i * d); } },
  { name: "multiply", level: 2, make: (r) => { const s = randInt(r, 1, 4), m = pick(r, [2, 3]); return [0, 1, 2, 3, 4, 5].map((i) => s * m ** i); } },
  { name: "increasing differences", level: 2, make: (r) => { let v = randInt(r, 1, 10); const d0 = randInt(r, 1, 3), dd = randInt(r, 1, 3); const out = [v]; for (let i = 0; i < 5; i++) { v += d0 + i * dd; out.push(v); } return out; } },
  { name: "alternating two operations", level: 3, make: (r) => { let v = randInt(r, 2, 10); const a = randInt(r, 2, 6), m = pick(r, [2, 3]); const out = [v]; for (let i = 0; i < 5; i++) { v = i % 2 === 0 ? v + a : v * m; out.push(v); } return out; } },
  { name: "interleaved series", level: 3, make: (r) => { const s1 = randInt(r, 1, 9), d1 = randInt(r, 2, 5), s2 = randInt(r, 20, 40), d2 = -randInt(r, 1, 4); return [0, 1, 2, 3, 4, 5].map((i) => (i % 2 === 0 ? s1 + (i / 2) * d1 : s2 + ((i - 1) / 2) * d2)); } },
  { name: "sum of previous two", level: 4, make: (r) => { const a = randInt(r, 1, 5), b = randInt(r, 2, 7); const out = [a, b]; while (out.length < 6) out.push(out[out.length - 1] + out[out.length - 2]); return out; } },
  { name: "multiply then subtract", level: 4, make: (r) => { let v = randInt(r, 2, 5); const k = randInt(r, 1, 3); const out = [v]; for (let i = 0; i < 5; i++) { v = v * 2 - k; out.push(v); } return out; } },
];

function numericDistractors(r: Rng, ans: number, seq: number[]): number[] {
  const last = seq[seq.length - 2];
  const cands = new Set<number>([ans + 1, ans - 1, ans + (ans - last), ans + 2, ans - 2, last + (last - seq[seq.length - 3]), Math.round(ans * 1.5)]);
  cands.delete(ans);
  return shuffle(r, [...cands].filter((x) => Number.isFinite(x))).slice(0, 4);
}

export function generateNumberSeries(seed: number, level: 1 | 2 | 3 | 4): SeriesItem {
  const r = makeRng(seed);
  const rule = pick(r, NUM_RULES.filter((x) => x.level === level));
  const seq = rule.make(r);
  const answer = seq[5];
  const options = shuffle(r, [answer, ...numericDistractors(r, answer, seq)]);
  return { id: `NUM-${level}-${seed}`, task: "number_series", shown: seq.slice(0, 5), answer, options, rule: rule.name, level, timeLimitSec: 40 + 10 * level };
}

// ------------------------------------------------------------------ 3. Letter series
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export function generateLetterSeries(seed: number, level: 1 | 2 | 3): SeriesItem {
  const r = makeRng(seed);
  let idx: number[];
  let rule: string;
  if (level === 1) { const s = randInt(r, 0, 8), d = randInt(r, 2, 3); idx = [0, 1, 2, 3, 4, 5].map((i) => s + i * d); rule = `skip ${d - 1}`; }
  else if (level === 2) { const s = randInt(r, 0, 5); idx = [s]; for (let i = 0; i < 5; i++) idx.push(idx[i] + i + 1); rule = "growing skips"; }
  else { const s = randInt(r, 0, 6), b = randInt(r, 18, 25); idx = [0, 1, 2, 3, 4, 5].map((i) => (i % 2 === 0 ? s + i : b - (i - 1))); rule = "interleaved forward/backward"; }
  if (idx.some((i) => i < 0 || i > 25)) return generateLetterSeries(seed + 1000003, level);
  const letters = idx.map((i) => ALPHA[i]);
  const ans = letters[5];
  const ai = idx[5];
  const distract = shuffle(r, [ai - 1, ai + 1, ai + 2, ai - 2, idx[4] + 1].filter((i) => i >= 0 && i <= 25 && i !== ai).map((i) => ALPHA[i]));
  const options = shuffle(r, [ans, ...[...new Set(distract)].slice(0, 4)]);
  return { id: `LET-${level}-${seed}`, task: "letter_series", shown: letters.slice(0, 5), answer: ans, options, rule, level, timeLimitSec: 45 + 10 * level };
}

// ------------------------------------------------------------------ 4. Mental rotation 2D (spatial, Gv)
export type Poly = [number, number][];
export type RotationItem = { id: string; task: "rotation2d"; target: Poly; options: { cells: Poly; angleDeg: number; mirrored: boolean }[]; answerIndices: number[]; cellsN: number; timeLimitSec: number };

function normalize(p: Poly): Poly {
  const minX = Math.min(...p.map((c) => c[0])), minY = Math.min(...p.map((c) => c[1]));
  return p.map(([x, y]) => [x - minX, y - minY] as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
const key = (p: Poly) => JSON.stringify(normalize(p));
const rot90 = (p: Poly): Poly => p.map(([x, y]) => [y, -x] as [number, number]);
const mirror = (p: Poly): Poly => p.map(([x, y]) => [-x, y] as [number, number]);
function allRotations(p: Poly): string[] { const out: string[] = []; let q = p; for (let i = 0; i < 4; i++) { out.push(key(q)); q = rot90(q); } return out; }

function randomPolyomino(r: Rng, n: number): Poly {
  const cells: Poly = [[0, 0]];
  const has = (x: number, y: number) => cells.some((c) => c[0] === x && c[1] === y);
  while (cells.length < n) {
    const [x, y] = pick(r, cells);
    const [dx, dy] = pick(r, [[1, 0], [-1, 0], [0, 1], [0, -1]] as const);
    if (!has(x + dx, y + dy)) cells.push([x + dx, y + dy]);
  }
  return normalize(cells);
}

/** Returns 4 options; 2 are rotations of the target, 2 are rotated mirror images (the classic Shepard-Metzler logic, in 2D). The renderer applies angleDeg as an SVG rotation so angles need not be multiples of 90. */
export function generateRotation2D(seed: number, cellsN: 5 | 6 | 7 | 8): RotationItem {
  const r = makeRng(seed);
  let p: Poly;
  // reject shapes that are mirror-symmetric (mirror would be a valid rotation)
  do { p = randomPolyomino(r, cellsN); } while (allRotations(p).includes(key(mirror(p))));
  const angles = shuffle(r, [45, 90, 135, 180, 225, 270, 315]);
  const opts = [
    { cells: p, angleDeg: angles[0], mirrored: false },
    { cells: p, angleDeg: angles[1], mirrored: false },
    { cells: normalize(mirror(p)), angleDeg: angles[2], mirrored: true },
    { cells: normalize(mirror(p)), angleDeg: angles[3], mirrored: true },
  ];
  const options = shuffle(r, opts);
  return { id: `ROT-${cellsN}-${seed}`, task: "rotation2d", target: p, options, answerIndices: options.map((o, i) => (o.mirrored ? -1 : i)).filter((i) => i >= 0), cellsN, timeLimitSec: 30 };
}

// ------------------------------------------------------------------ 5. Working memory: backward digit span + Corsi
export type SpanTrial = { id: string; task: "backward_digits" | "corsi"; sequence: number[]; correctResponse: number[]; length: number };

export function generateBackwardDigits(seed: number, length: number): SpanTrial {
  const r = makeRng(seed);
  const seq: number[] = [];
  while (seq.length < length) { const d = randInt(r, 1, 9); if (d !== seq[seq.length - 1]) seq.push(d); }
  return { id: `BDS-${length}-${seed}`, task: "backward_digits", sequence: seq, correctResponse: seq.slice().reverse(), length };
}
/** Corsi: 9 fixed block positions on screen (indices 0-8). Forward recall of spatial sequences. */
export const CORSI_LAYOUT: [number, number][] = [[0.15, 0.2], [0.55, 0.12], [0.85, 0.3], [0.3, 0.45], [0.65, 0.5], [0.1, 0.7], [0.45, 0.75], [0.8, 0.72], [0.35, 0.92]];
export function generateCorsi(seed: number, length: number): SpanTrial {
  // A sequence can't be longer than the board: asking for 10 used to return 9 taps labelled 10.
  if (!Number.isInteger(length) || length < 1 || length > CORSI_LAYOUT.length) {
    throw new RangeError(`Corsi length must be 1–${CORSI_LAYOUT.length} (the board has ${CORSI_LAYOUT.length} blocks); got ${length}`);
  }
  const r = makeRng(seed);
  const seq = shuffle(r, [0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, length);
  return { id: `CORSI-${length}-${seed}`, task: "corsi", sequence: seq, correctResponse: seq, length };
}
/** Adaptive span procedure: start at 3, two trials per length, advance if >=1 correct, stop after 2 failures at one length. Span = longest length with >=1 correct. */
export const SPAN_PROTOCOL = { startLength: 3, trialsPerLength: 2, maxLength: 10, stopRule: "both trials at a length wrong", presentationMs: 900, isiMs: 300 } as const;
/** Corsi uses the same procedure, capped at the number of blocks on the board (9). */
export const CORSI_PROTOCOL = { ...SPAN_PROTOCOL, maxLength: CORSI_LAYOUT.length } as const;

// ------------------------------------------------------------------ 6. Processing speed: symbol matching
export const SYMBOLS = ["◇", "△", "○", "□", "☆", "⬠", "⬡", "✕", "＋", "◐", "◑", "▽"] as const;
export type SpeedTrial = { id: string; task: "symbol_match"; left: string[]; right: string[]; same: boolean };
export function generateSymbolMatchBlock(seed: number, n = 120): SpeedTrial[] {
  const r = makeRng(seed);
  const out: SpeedTrial[] = [];
  for (let i = 0; i < n; i++) {
    const left = shuffle(r, SYMBOLS).slice(0, 3);
    const same = r() < 0.5;
    const right = left.slice();
    if (!same) { const pos = randInt(r, 0, 2); right[pos] = pick(r, SYMBOLS.filter((s) => !left.includes(s))); }
    out.push({ id: `SYM-${seed}-${i}`, task: "symbol_match", left, right: shuffle(r, right), same });
  }
  return out;
}
/** Score: (correct - incorrect) in 90 seconds. Penalizing errors removes the incentive to guess fast. */
export const SPEED_PROTOCOL = { durationSec: 90, score: "correct - incorrect", practiceTrials: 6 } as const;

// ------------------------------------------------------------------ 7. Choice reaction time
export type RtTrial = { id: string; task: "choice_rt"; stimulus: 0 | 1 | 2 | 3; foreperiodMs: number };
export function generateChoiceRT(seed: number, n = 60): RtTrial[] {
  const r = makeRng(seed);
  return Array.from({ length: n }, (_, i) => ({ id: `CRT-${seed}-${i}`, task: "choice_rt" as const, stimulus: randInt(r, 0, 3) as 0 | 1 | 2 | 3, foreperiodMs: randInt(r, 600, 1800) }));
}
/** Device latency differs a lot between phones and laptops, so RT is used only (a) within-person, (b) compared against norms for the same device class. Record device class and input type with every trial. */

// ------------------------------------------------------------------ 8. Learning-rate task (novel: how fast you improve)
export type LearnBlock = { block: number; mapping: Record<string, number>; trials: { symbol: string; correctKey: number }[] };
/**
 * A brand-new symbol->key mapping that nobody has practised. Six blocks of 24 trials.
 * The outcome is the slope of accuracy and speed across blocks (learning rate), not the level.
 * This links the profile to the product's core thesis: rate of improvement in a sprint.
 */
export function generateLearningTask(seed: number, blocks = 6, trialsPerBlock = 24): LearnBlock[] {
  const r = makeRng(seed);
  const syms = shuffle(r, SYMBOLS).slice(0, 6);
  const mapping: Record<string, number> = {};
  syms.forEach((s, i) => { mapping[s] = (i % 3) + 1; }); // 6 symbols onto 3 keys: must be learned, not guessed
  return Array.from({ length: blocks }, (_, b) => ({ block: b + 1, mapping, trials: Array.from({ length: trialsPerBlock }, () => { const s = pick(r, syms); return { symbol: s, correctKey: mapping[s] }; }) }));
}
/** Scoring: fit accuracy(block) = a + b*log(block); learning rate = b. Also fit median correct RT. Report relative to the user's own level (fast starters have less room to grow). */

// ------------------------------------------------------------------ 9. Balloon risk task (behavioural risk tolerance)
export type BalloonSchedule = { id: string; task: "balloon"; explosionPoints: number[]; centsPerPump: number; maxPumps: number };
/** Standard BART logic (Lejuez et al., 2002): each balloon explodes at a random pump between 1 and maxPumps. 30 balloons. */
export function generateBalloonSchedule(seed: number, balloons = 30, maxPumps = 64): BalloonSchedule {
  const r = makeRng(seed);
  return { id: `BART-${seed}`, task: "balloon", explosionPoints: Array.from({ length: balloons }, () => randInt(r, 1, maxPumps)), centsPerPump: 1, maxPumps };
}
/** Score: adjusted mean pumps (mean pumps on balloons that did NOT explode). Also record pumps after an explosion vs after a cash-out (reaction to losses). */

// ------------------------------------------------------------------ 10. Delay discounting (patience), adaptive titration
export type DiscountQuestion = { id: string; task: "delay_discount"; sooner: number; later: number; delayDays: number };
/**
 * 5-step adjusting-amount procedure per delay. Start sooner = later/2. If the user picks sooner,
 * lower the sooner amount by half the remaining step; if later, raise it. After 5 choices, the
 * indifference point = final sooner amount. Delays: 7, 30, 90, 365 days. Amounts in local currency.
 * Score: area under the discounting curve (AUC, 0-1, higher = more patient).
 */
export function discountNext(later: number, delayDays: number, history: ("sooner" | "later")[]): DiscountQuestion | { indifference: number } {
  let sooner = later / 2;
  let step = later / 4;
  for (const choice of history) { sooner = choice === "sooner" ? sooner - step : sooner + step; step /= 2; }
  if (history.length >= 5) return { indifference: Math.round(sooner) };
  return { id: `DD-${delayDays}-${history.length}`, task: "delay_discount", sooner: Math.round(sooner), later, delayDays };
}

// ------------------------------------------------------------------ 11. Quantitative reasoning (word problems)
export type QuantItem = { id: string; task: "quant"; text: string; answer: number; options: number[]; level: number; timeLimitSec: number };
type QuantTemplate = { level: number; make: (r: Rng) => { text: string; answer: number; errors?: number[] } };
const QUANT: QuantTemplate[] = [
  { level: 1, make: (r) => { const p = randInt(r, 4, 12) * 10, d = pick(r, [10, 20, 25]); return { text: `A jacket costs ${p} kr. It is reduced by ${d}%. What is the new price in kr?`, answer: p * (1 - d / 100) }; } },
  { level: 2, make: (r) => { const w = pick(r, [2, 3, 4, 6]), k = pick(r, [3, 4, 6, 8, 12].filter((x) => x !== w)), t = 12 * randInt(r, 1, 3); return { text: `${w} people can paint a fence in ${t} hours. How many hours would ${k} people need, working at the same rate?`, answer: (w * t) / k }; } },
  { level: 2, make: (r) => { const v = randInt(r, 50, 90), t = pick(r, [1.5, 2, 2.5]); return { text: `A car drives at ${v} km/h for ${t} hours. How many kilometres does it travel?`, answer: v * t }; } },
  { level: 3, make: (r) => { const conv = pick(r, [0.02, 0.03, 0.04, 0.05]), calls = randInt(r, 4, 9) * 50, value = randInt(r, 5, 20) * 1000; return { text: `A salesperson makes ${calls} calls. ${conv * 100}% of calls turn into a meeting, and 1 in 4 meetings becomes a sale worth ${value} kr. What is the total sales value in kr?`, answer: calls * conv * 0.25 * value }; } },
  { level: 3, make: (r) => { const a = randInt(r, 2, 6) * 100, g = pick(r, [10, 20, 50]); return { text: `A channel has ${a} subscribers and grows by ${g}% every month. How many subscribers will it have after 2 months?`, answer: Math.round(a * (1 + g / 100) ** 2) }; } },
  { level: 4, make: (r) => { const p = pick(r, [0.2, 0.25, 0.4]), win = randInt(r, 3, 6) * 100, cost = randInt(r, 50, 150); return { text: `A bet costs ${cost} kr. You win ${win} kr with probability ${p * 100}% and nothing otherwise. What is the expected profit per bet in kr? (Negative if you lose money on average.)`, answer: Math.round(p * win - cost), errors: [Math.round(p * win), Math.round(win - cost), -cost, Math.round(p * (win - cost))] }; } },
];
export function generateQuant(seed: number, level: 1 | 2 | 3 | 4): QuantItem {
  const r = makeRng(seed);
  const t = pick(r, QUANT.filter((q) => q.level === level));
  const { text, answer, errors } = t.make(r);
  const ans = Math.round(answer * 100) / 100;
  // Prefer distractors that model typical reasoning errors; fall back to nearby values.
  const pool = [...(errors ?? []), Math.round(ans * 1.1), Math.round(ans * 0.9), Math.round(ans * 2), Math.round(ans / 2)];
  const ds = new Set<number>(pool.filter((x) => x !== ans));
  for (let k = 1; ds.size < 3; k++) { ds.add(ans + 10 * k); if (ds.size < 3) ds.add(ans - 10 * k); }
  const chosen = errors ? [...ds].slice(0, 3) : shuffle(r, [...ds]).slice(0, 3);
  return { id: `Q-${level}-${seed}`, task: "quant", text, answer: ans, options: shuffle(r, [ans, ...chosen]), level, timeLimitSec: 60 + 20 * level };
}
