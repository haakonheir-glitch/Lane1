import Link from "next/link";
import type { Lane, Sprint } from "@/lib/types";
import { ciHalf, fmtSigned } from "@/lib/format";
import { mean } from "@/lib/scoring";
import { cn } from "@/lib/cn";

export type ComparisonRow = {
  lane: Lane;
  sprint: Sprint;
  performance: { value: number; pm: number } | null;
  improvement: number | null;
  energy: number;
  wantsToContinue: boolean | null;
};

export function buildComparisonRows(sprints: Sprint[], lanes: Lane[]): ComparisonRow[] {
  return sprints
    .filter((s) => s.status !== "suggested")
    .map((s) => {
      const lane = lanes.find((l) => l.id === s.laneId)!;
      const lastContinue = s.checkIns[s.checkIns.length - 1]?.continue;
      return {
        lane,
        sprint: s,
        performance: s.outcome ? { value: s.outcome.performance.value, pm: ciHalf(s.outcome.performance) } : null,
        improvement: s.outcome?.improvementRate ?? null,
        energy: s.outcome?.energyAvg ?? mean(s.checkIns.map((c) => c.energy)),
        wantsToContinue: s.outcome ? s.outcome.wantsToContinue : lastContinue !== undefined ? lastContinue >= 5 : null,
      };
    });
}

/** All lanes tried, side by side. */
export function LaneComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" tabIndex={0} role="region" aria-label="Lane comparison, scrollable">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <caption className="sr-only">Lanes tried, compared</caption>
        <thead>
          <tr className="border-b border-rule-strong">
            {["Lane · sprint", "Status", "Performance", "Improvement", "Energy avg", "Continue?"].map((h, i) => (
              <th key={h} scope="col" className={cn("py-2 pr-4 label font-normal text-ink-3", i > 1 && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.sprint.id} className="border-b border-rule">
              <th scope="row" className="py-4 pr-4 font-normal">
                <Link href={`/sprints/${r.sprint.id}`} className="text-body text-ink transition-quiet hover:text-ink-2">
                  {r.lane.name}
                </Link>
                <span className="block text-small text-ink-3">{r.sprint.title}</span>
              </th>
              <td className="py-4 pr-4 label text-ink-2">{r.sprint.status === "active" ? `Day ${r.sprint.currentDay}/${r.sprint.days}` : "Completed"}</td>
              <td className="py-4 pr-4 text-right font-mono text-small text-ink">
                {r.performance ? (
                  <>
                    {r.performance.value}
                    <span className="text-label text-ink-3"> ±{r.performance.pm}</span>
                  </>
                ) : (
                  <span className="text-ink-3">pending</span>
                )}
              </td>
              <td className={cn("py-4 pr-4 text-right font-mono text-small", r.improvement !== null && r.improvement >= 20 ? "text-positive" : "text-ink")}>
                {r.improvement !== null ? `${fmtSigned(r.improvement)}%` : <span className="text-ink-3">pending</span>}
              </td>
              <td className="py-4 pr-4 text-right font-mono text-small text-ink">
                {r.energy.toFixed(1)}
                <span className="text-label text-ink-3"> /7</span>
              </td>
              <td className="py-4 text-right label text-ink">
                {r.wantsToContinue === null ? "—" : r.wantsToContinue ? "Yes" : "No"}
                {r.sprint.status === "active" ? <span className="text-ink-3"> (so far)</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
