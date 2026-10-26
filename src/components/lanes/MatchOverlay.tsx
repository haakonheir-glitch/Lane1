import type { MatchOverlay as Overlay } from "@/lib/lanes/types";

const SIZE = 300;
const C = SIZE / 2;
const R = 100;
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const pt = (i: number, n: number, r: number): [number, number] => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
/** Your score relative to your own average: the dashed ring is your average, ±1.5 SD spans the radius. */
export const youRadius = (z: number) => clamp(0.5 + z / 3, 0.04, 1);

/**
 * The fit, visible: what the career path asks for (ink outline) and where you are on the same axes
 * (blue), using the constructs the matching function uses for this path. Where blue reaches past
 * the outline, the path uses something that is high for you.
 */
export function MatchOverlay({ overlay, name }: { overlay: Overlay; name: string }) {
  const axes = overlay.axes.filter((a) => a.you !== null);
  const unmeasured = overlay.axes.filter((a) => a.you === null).map((a) => a.label);
  if (axes.length < 3) return unmeasured.length ? <p className="text-small text-ink-3">Not enough of this path&apos;s demands are measured yet to draw the comparison.</p> : null;
  const n = axes.length;
  const poly = (rs: number[]) => rs.map((r, i) => pt(i, n, r * R).map((v) => v.toFixed(1)).join(",")).join(" ");
  const you = axes.map((a) => youRadius(a.you!));
  return (
    <figure>
      <svg viewBox={`-110 -6 ${SIZE + 220} ${SIZE + 12}`} className="h-auto w-full" role="img" aria-label={`How you compare with what ${name} asks for, on ${n} axes.`}>
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <polygon key={r} points={poly(axes.map(() => r))} fill="none" className={r === 0.5 ? "stroke-ink-4" : "stroke-rule"} strokeDasharray={r === 0.5 ? "3 3" : undefined} strokeWidth={1} />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pt(i, n, R);
          return <line key={i} x1={C} y1={C} x2={x} y2={y} className="stroke-rule" />;
        })}
        <polygon points={poly(you)} className="fill-you-2 stroke-you-5" strokeWidth={1.5} strokeLinejoin="round" />
        <polygon points={poly(axes.map((a) => a.demand))} fill="none" className="stroke-ink" strokeWidth={1.5} strokeLinejoin="round" />
        {axes.map((a, i) => {
          const [x, y] = pt(i, n, R + 14);
          const anchor = Math.abs(x - C) < 6 ? "middle" : x > C ? "start" : "end";
          return (
            <text key={a.label} x={x} y={y + (y < C - 20 ? -2 : y > C + 20 ? 10 : 4)} textAnchor={anchor} fontSize={12} className="fill-ink-2" style={{ fontFamily: "var(--font-sans)" }}>
              {a.label}
            </text>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-small text-ink-3">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block h-0.5 w-4 bg-ink" />
          What this path asks for
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block h-2.5 w-4 border border-you-5 bg-you-2" />
          You, against your own average (dashed ring)
        </span>
      </figcaption>
      {unmeasured.length ? <p className="mt-2 text-small text-ink-3">Not measured yet, so not drawn: {unmeasured.join(" · ")}.</p> : null}
      <ul className="sr-only">
        {axes.map((a) => (
          <li key={a.label}>
            {a.label}: {`${a.you! >= 0 ? "+" : "−"}${Math.abs(a.you!).toFixed(1)} against your own average`}
          </li>
        ))}
      </ul>
    </figure>
  );
}
