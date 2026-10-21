import type { RiasecDimension } from "@/lib/types";
import { cn } from "@/lib/cn";

const SIZE = 320;
const C = SIZE / 2;
const R = 112;

function point(i: number, v: number): [number, number] {
  const angle = -Math.PI / 2 + (i * Math.PI) / 3;
  const r = (v / 100) * R;
  return [C + r * Math.cos(angle), C + r * Math.sin(angle)];
}

const poly = (vals: number[]) => vals.map((v, i) => point(i, v).map((n) => n.toFixed(2)).join(",")).join(" ");

/** Hexagonal RIASEC chart: hairline frame, user polygon in accent at 12% fill. */
export function RadarProfile({
  dimensions,
  showCi = true,
  className,
}: {
  dimensions: RiasecDimension[];
  showCi?: boolean;
  className?: string;
}) {
  const values = dimensions.map((d) => d.score.value);
  const top = Math.max(...values);
  return (
    <figure className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto h-auto w-full max-w-[360px] overflow-visible"
        role="img"
        aria-label={`Interest profile. ${dimensions.map((d) => `${d.label} ${Math.round(d.score.value)}`).join(", ")}.`}
      >
        <polygon points={poly([100, 100, 100, 100, 100, 100])} fill="none" className="stroke-rule-strong" />
        <polygon points={poly([50, 50, 50, 50, 50, 50])} fill="none" className="stroke-rule" />
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
        <polygon points={poly(values)} className="fill-accent stroke-accent" fillOpacity={0.12} strokeWidth={1.5} strokeLinejoin="round" />
        {dimensions.map((d, i) => {
          const [x, y] = point(i, d.score.value);
          return <circle key={d.key} cx={x} cy={y} r={2.5} className="fill-accent" />;
        })}
        {dimensions.map((d, i) => {
          const [x, y] = point(i, 124);
          const anchor = Math.abs(x - C) < 4 ? "middle" : x > C ? "start" : "end";
          const dy = y < C - 40 ? -4 : y > C + 40 ? 12 : 4;
          return (
            <text key={d.key} x={x} y={y + dy} textAnchor={anchor} fontSize={11} className={d.score.value === top ? "fill-ink" : "fill-ink-3"}>
              {d.key} {Math.round(d.score.value)}
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
