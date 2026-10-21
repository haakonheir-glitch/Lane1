"use client";

import { LineChart, type LineSeries } from "@/components/data/LineChart";
import { formatDay } from "@/lib/format";
import type { ConvictionSeries } from "@/lib/types";

/** Conviction per tried lane over time. The leading lane is the one accent line. */
export function ConvictionChart({
  series,
  laneNames,
  height = 260,
}: {
  series: ConvictionSeries[];
  laneNames: Record<string, string>;
  height?: number;
}) {
  const dates = series[0]?.points.map((p) => p.date) ?? [];
  const leader = [...series].sort(
    (a, b) => (b.points[b.points.length - 1]?.value ?? 0) - (a.points[a.points.length - 1]?.value ?? 0),
  )[0];
  const lines: LineSeries[] = series.map((s) => ({
    id: s.laneId,
    label: laneNames[s.laneId] ?? s.laneId,
    emphasis: s.laneId === leader?.laneId,
    points: s.points.map((p, i) => ({ x: i, y: p.value, ci: p.ci })),
  }));
  return (
    <LineChart
      series={lines}
      xLabels={dates.map(formatDay)}
      yDomain={[0, 100]}
      yTicks={[0, 50, 100]}
      unit="/100"
      height={height}
      label={`Conviction over time. ${lines
        .map((l) => `${l.label}: ${l.points[0]?.y} to ${l.points[l.points.length - 1]?.y}`)
        .join("; ")}.`}
    />
  );
}
