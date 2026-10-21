import { payoffCurve, payoffLabel } from "@/lib/lanes/payoff";
import type { PayoffType } from "@/lib/types";
import { cn } from "@/lib/cn";

const W = 48;
const H = 20;
const PAD = 2;

export function curvePath(type: PayoffType, w: number, h: number, pad: number, steps = 32) {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const y = payoffCurve(type, x);
    pts.push(`${(pad + x * (w - 2 * pad)).toFixed(2)},${(h - pad - y * (h - 2 * pad)).toFixed(2)}`);
  }
  return `M${pts.join("L")}`;
}

/** 48×20 payoff-shape glyph with the user's estimated position. */
export function PayoffGlyph({
  type,
  position,
  emphasis,
  className,
}: {
  type: PayoffType;
  position?: number;
  emphasis?: boolean;
  className?: string;
}) {
  const px = position !== undefined ? PAD + position * (W - 2 * PAD) : undefined;
  const py = position !== undefined ? H - PAD - payoffCurve(type, position) * (H - 2 * PAD) : undefined;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={`Payoff: ${payoffLabel[type]}${position !== undefined ? `, estimated position at ${Math.round(position * 100)}th skill percentile` : ""}`}
      className={cn("shrink-0 overflow-visible", className)}
    >
      <line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} className="stroke-rule" strokeWidth={1} />
      <path d={curvePath(type, W, H, PAD)} fill="none" className="stroke-ink-2" strokeWidth={1.25} strokeLinejoin="round" />
      {px !== undefined && py !== undefined ? (
        <circle cx={px} cy={py} r={2.5} className={emphasis ? "fill-accent" : "fill-ink"} />
      ) : null}
    </svg>
  );
}
