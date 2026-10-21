import { payoffCurve, payoffLabel } from "@/lib/lanes/payoff";
import type { PayoffType } from "@/lib/types";
import { curvePath } from "./PayoffGlyph";

const W = 400;
const H = 200;
const L = 36; // left axis gutter
const B = 28; // bottom axis gutter
const T = 12;
const R = 12;

/** Full-size payoff curve with the user's estimated position and interval. */
export function PayoffCurve({
  type,
  position,
  positionCi,
}: {
  type: PayoffType;
  position: number;
  positionCi: [number, number];
}) {
  const pw = W - L - R;
  const ph = H - T - B;
  const sx = (x: number) => L + x * pw;
  const sy = (y: number) => T + (1 - y) * ph;
  const path = curvePath(type, pw, ph, 0);
  const y = payoffCurve(type, position);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${payoffLabel[type]} payoff curve. Your estimated position is the ${Math.round(position * 100)}th skill percentile, interval ${Math.round(positionCi[0] * 100)} to ${Math.round(positionCi[1] * 100)}.`}
    >
      {/* interval band */}
      <rect x={sx(positionCi[0])} y={T} width={sx(positionCi[1]) - sx(positionCi[0])} height={ph} className="fill-accent" opacity={0.08} />
      {/* axes */}
      <line x1={L} x2={W - R} y1={T + ph + 0.5} y2={T + ph + 0.5} className="stroke-rule-strong" />
      <line x1={L - 0.5} x2={L - 0.5} y1={T} y2={T + ph} className="stroke-rule" />
      {/* median skill reference */}
      <line x1={sx(0.5)} x2={sx(0.5)} y1={T} y2={T + ph} className="stroke-rule-strong" strokeDasharray="2 3" />
      <g transform={`translate(${L} ${T})`}>
        <path d={path} fill="none" className="stroke-ink" strokeWidth={1.5} strokeLinejoin="round" />
      </g>
      {/* user marker */}
      <line x1={sx(position)} x2={sx(position)} y1={sy(y)} y2={T + ph} className="stroke-accent" strokeWidth={1} />
      <circle cx={sx(position)} cy={sy(y)} r={4} className="fill-accent" />
      <text x={sx(position) + 8} y={sy(y) + 16} className="fill-accent" fontSize={10}>
        YOU (EST.)
      </text>
      {/* labels */}
      {[0, 0.5, 1].map((t) => (
        <text key={t} x={sx(t)} y={H - 10} textAnchor={t === 0 ? "start" : t === 1 ? "end" : "middle"} className="fill-ink-3" fontSize={10}>
          {t === 0.5 ? "P50" : `P${t * 100}`}
        </text>
      ))}
      <text x={L - 8} y={T + 8} textAnchor="end" className="fill-ink-3" fontSize={10}>
        HI
      </text>
      <text x={L - 8} y={T + ph} textAnchor="end" className="fill-ink-3" fontSize={10}>
        LO
      </text>
    </svg>
  );
}
