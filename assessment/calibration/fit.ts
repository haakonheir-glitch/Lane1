/**
 * Fitting for the calibration: elicited probabilities → 3PL item parameters. Pure.
 *
 * Model (guessing c fixed by the response format):
 *   P(θ) = c + (1 − c) · σ(a(θ − b)),   so   logit((P − c)/(1 − c)) = a(θ − b).
 * The elicited p16, p50, p84 sit at θ = −1, 0, +1 (±1 SD of general reasoning ability).
 */

export type Elicited = { p16: number; p50: number; p84: number };
export type Call = Elicited & { itemId: string; repeat: number };

export const A_RANGE: [number, number] = [0.4, 2.5];
const THETAS = [-1, 0, 1] as const;

export const logit = (x: number) => Math.log(x / (1 - x));
export const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Keeps p strictly inside the model's range so the logit is finite: (c + 0.01, 0.99). */
export const clampP = (p: number, c: number) => Math.min(0.99, Math.max(c + 0.01, p));

/** Probability correct at ability θ. */
export const pCorrect = (theta: number, a: number, b: number, c: number) => c + (1 - c) * sigmoid(a * (theta - b));

/**
 * Least-squares 3PL fit through the three points. With θ = −1, 0, +1 the slope is
 * (y₈₄ − y₁₆)/2; a is clipped to A_RANGE, then b is refitted for that a: b = −mean(y)/a.
 */
export function fit3pl(e: Elicited, c: number): { a: number; b: number; aUnclipped: number } {
  const y = [e.p16, e.p50, e.p84].map((p) => logit((clampP(p, c) - c) / (1 - c)));
  const aUnclipped = (y[2]! - y[0]!) / (THETAS[2] - THETAS[0]);
  const a = Math.min(A_RANGE[1], Math.max(A_RANGE[0], aUnclipped));
  const meanY = (y[0]! + y[1]! + y[2]!) / 3;
  return { a, b: -meanY / a, aUnclipped };
}

export function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((p, q) => p - q);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Linear-interpolation quantile (type 7, the R/NumPy default). */
export function quantile(xs: number[], q: number): number {
  const s = [...xs].sort((p, r) => p - r);
  const h = (s.length - 1) * q;
  const lo = Math.floor(h);
  return s[lo]! + (h - lo) * ((s[Math.min(lo + 1, s.length - 1)] ?? s[lo]!) - s[lo]!);
}
export const iqr = (xs: number[]) => quantile(xs, 0.75) - quantile(xs, 0.25);

export function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

/** Median p16, p50 and p84 across calls. */
export const medianElicited = (calls: Elicited[]): Elicited => ({
  p16: median(calls.map((x) => x.p16)),
  p50: median(calls.map((x) => x.p50)),
  p84: median(calls.map((x) => x.p84)),
});

/** Deterministic PRNG (mulberry32) so bootstrap results are reproducible. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard error of b: resample the calls with replacement, take medians, refit. */
export function bootstrapSeB(calls: Elicited[], c: number, samples: number, seed: number): number {
  if (calls.length < 2) return NaN;
  const r = rng(seed);
  const bs: number[] = [];
  for (let k = 0; k < samples; k++) {
    const draw = Array.from({ length: calls.length }, () => calls[Math.floor(r() * calls.length)]!);
    bs.push(fit3pl(medianElicited(draw), c).b);
  }
  return sd(bs);
}

/** Spread of b across the items in one configuration (each item: median of its repeats, then fit). */
export function sdBWithin(calls: Call[], c: number): number {
  const byItem = new Map<string, Call[]>();
  for (const x of calls) byItem.set(x.itemId, [...(byItem.get(x.itemId) ?? []), x]);
  return sd([...byItem.values()].map((cs) => fit3pl(medianElicited(cs), c).b));
}

/**
 * Isotonic (non-decreasing) regression by pool-adjacent-violators, equal weights:
 * the closest non-decreasing sequence in least squares.
 */
export function isotonic(values: number[]): number[] {
  const blocks: { sum: number; n: number }[] = [];
  for (const v of values) {
    blocks.push({ sum: v, n: 1 });
    while (blocks.length > 1 && blocks.at(-2)!.sum / blocks.at(-2)!.n > blocks.at(-1)!.sum / blocks.at(-1)!.n) {
      const last = blocks.pop()!;
      blocks.at(-1)!.sum += last.sum;
      blocks.at(-1)!.n += last.n;
    }
  }
  return blocks.flatMap((bl) => Array<number>(bl.n).fill(bl.sum / bl.n));
}

export type ConfigFit = {
  level: number;
  c: number;
  medians: Elicited;
  a: number;
  aUnclipped: number;
  /** b before the isotonic step, and after it (the value used for scoring). */
  bRaw: number;
  b: number;
  seB: number;
  sdBWithin: number;
  nCalls: number;
  iqrP50: number;
  flags: string[];
};

export const DISAGREEMENT_IQR = 0.25;
export const Z95 = 1.96;

/** Fits every level of one task, enforces increasing difficulty, and flags problems. */
export function fitTask(levels: { level: number; c: number; calls: Call[] }[], bootstrap: { samples: number; seed: number }): ConfigFit[] {
  const sorted = [...levels].sort((x, y) => x.level - y.level);
  const fits = sorted.map((l, i) => {
    const medians = medianElicited(l.calls);
    const { a, b, aUnclipped } = fit3pl(medians, l.c);
    return {
      level: l.level,
      c: l.c,
      medians,
      a,
      aUnclipped,
      bRaw: b,
      b,
      seB: bootstrapSeB(l.calls, l.c, bootstrap.samples, bootstrap.seed + i),
      sdBWithin: sdBWithin(l.calls, l.c),
      nCalls: l.calls.length,
      iqrP50: iqr(l.calls.map((x) => x.p50)),
      flags: [] as string[],
    };
  });
  const iso = isotonic(fits.map((f) => f.bRaw));
  fits.forEach((f, i) => {
    f.b = iso[i]!;
    if (f.iqrP50 > DISAGREEMENT_IQR) f.flags.push(`calls disagree: IQR of p50 = ${f.iqrP50.toFixed(2)}`);
    if (f.a !== f.aUnclipped) f.flags.push(`slope clipped from ${f.aUnclipped.toFixed(2)} to ${f.a.toFixed(2)}`);
    if (Math.abs(f.b - f.bRaw) >= 0.005) f.flags.push(`difficulty adjusted to keep levels in order (b ${f.bRaw.toFixed(2)} → ${f.b.toFixed(2)})`);
  });
  for (let i = 1; i < fits.length; i++) {
    const lo = fits[i - 1]!;
    const hi = fits[i]!;
    const gap = hi.b - lo.b;
    const needed = Z95 * Math.sqrt(lo.seB ** 2 + hi.seB ** 2);
    if (!(gap > needed)) hi.flags.push(`not clearly separated from level ${lo.level} (Δb = ${gap.toFixed(2)}, needs > ${needed.toFixed(2)})`);
  }
  return fits;
}

/** Blends Claude's estimate with a literature anchor (weight on the literature). */
export function blendNorm(claude: { mean: number; sd: number }, anchor?: { mean: number; sd: number; weight: number }) {
  if (!anchor) return { mean: claude.mean, sd: claude.sd };
  return { mean: anchor.weight * anchor.mean + (1 - anchor.weight) * claude.mean, sd: anchor.weight * anchor.sd + (1 - anchor.weight) * claude.sd };
}
