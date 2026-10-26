import type { RiasecDimension } from "@/lib/types";

type Dimension = RiasecDimension & { display?: string };
import { cn } from "@/lib/cn";

const SIZE = 360;
const C = SIZE / 2;
const R = 132;

function point(i: number, v: number): [number, number] {
  const angle = -Math.PI / 2 + (i * Math.PI) / 3;
  const r = (v / 100) * R;
  return [C + r * Math.cos(angle), C + r * Math.sin(angle)];
}

const poly = (vals: number[]) => vals.map((v, i) => point(i, v).map((n) => n.toFixed(2)).join(",")).join(" ");

/**
 * Hexagonal RIASEC chart: hairline rings, your polygon as an ink outline over a solid blue fill. `scale` labels the centre and
 * rings with the axis values (for interests the centre is the lowest possible score, 10).
 */
export function RadarProfile({
  dimensions,
  showCi = true,
  scale,
  className,
}: {
  dimensions: Dimension[];
  showCi?: boolean;
  /** Axis values at the centre, middle ring and outer ring. */
  scale?: [string, string, string];
  className?: string;
}) {
  const values = dimensions.map((d) => d.score.value);
  const top = Math.max(...values);
  return (
    <figure className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto h-auto w-full max-w-[440px] overflow-visible"
        role="img"
        aria-label={`Interest profile. ${dimensions.map((d) => `${d.label} ${d.display ?? Math.round(d.score.value)}`).join(", ")}.`}
      >
        <polygon points={poly([100, 100, 100, 100, 100, 100])} fill="none" className="stroke-rule-strong" />
        {[25, 50, 75].map((v) => (
          <polygon key={v} points={poly([v, v, v, v, v, v])} fill="none" className="stroke-rule" />
        ))}
        {dimensions.map((_, i) => {
          const [x, y] = point(i, 100);
          return <line key={i} x1={C} y1={C} x2={x} y2={y} className="stroke-rule" />;
        })}
        {showCi
          ? dimensions.map((d, i) => {
              const [x1, y1] = point(i, d.score.ci[0]);
              const [x2, y2] = point(i, d.score.ci[1]);
              return <line key={d.key} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-accent" strokeWidth={3} opacity={0.3} />;
            })
          : null}
        {scale
          ? ([0, 50, 100] as const).map((v, k) => {
              const [, y] = point(0, v);
              return (
                <text key={v} x={C + 4} y={y + (v === 0 ? 12 : -3)} fontSize={10} className="fill-ink-3 font-mono">
                  {scale[k]}
                </text>
              );
            })
          : null}
        <polygon points={poly(values)} className="fill-you-2 stroke-ink" strokeWidth={1.75} strokeLinejoin="round" />
        {dimensions.map((d, i) => {
          const [x, y] = point(i, d.score.value);
          return <circle key={d.key} cx={x} cy={y} r={3} className="fill-ink" />;
        })}
        {dimensions.map((d, i) => {
          const [x, y] = point(i, 112);
          const anchor = Math.abs(x - C) < 4 ? "middle" : x > C ? "start" : "end";
          const dy = y < C - 40 ? -4 : y > C + 40 ? 12 : 4;
          return (
            <text key={d.key} x={x} y={y + dy} textAnchor={anchor} fontSize={12} className={d.score.value === top ? "fill-ink font-medium" : "fill-ink-2"}>
              {d.key} {d.display ?? Math.round(d.score.value)}
            </text>
          );
        })}
      </svg>
      <figcaption className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 label text-ink-3">
        {dimensions.map((d) => (
          <span key={d.key}>
            <span className="text-ink-2">{d.key}</span> {d.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
