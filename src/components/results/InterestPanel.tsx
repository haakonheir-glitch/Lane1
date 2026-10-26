import { RadarProfile } from "@/components/data/RadarProfile";
import type { InterestScores } from "@/lib/scoring/interests";
import { radarDims, relativeOf } from "@/lib/view/profile";
import { NormedFigure } from "./NormedBar";
import { RelativeTag } from "./RelativeTag";

/** O*NET Interest Profiler results: radar of raw sums (10–50), table with intervals, Holland code. */
export function InterestPanel({ interests }: { interests: InterestScores }) {
  const rel = relativeOf(interests.scales);
  const ranked = [...interests.scales].sort((a, b) => (b.raw ?? 0) - (a.raw ?? 0));
  const dims = radarDims(interests);
  const selfMode = !interests.scales.some((s) => s.normed) && interests.scales.some((s) => s.self);
  return (
    <div className="grid gap-12 md:grid-cols-12">
      <div className="md:col-span-6">
        <RadarProfile dimensions={dims} showCi={false} scale={["10", "30", "50"]} />
      </div>
      <div className="md:col-span-6">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Interest scores</caption>
          <thead>
            <tr className="border-b border-rule-strong">
              <th scope="col" className="py-2 label font-normal text-ink-3">Area</th>
              <th scope="col" className="py-2 text-right label font-normal text-ink-3">Raw 10–50</th>
              <th scope="col" className="py-2 text-right label font-normal text-ink-3">{selfMode ? "vs your average" : "Normed · 90%"}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s) => (
              <tr key={s.code} className="border-b border-rule">
                <th scope="row" className="py-3 font-normal">
                  <span className="mr-3 font-mono text-small text-ink-3">{s.code}</span>
                  <span className="text-body text-ink">{s.label}</span>
                  <span className="ml-2">
                    <RelativeTag r={rel[s.id] ?? "none"} />
                  </span>
                </th>
                <td className="py-3 text-right font-mono text-small text-ink">{s.raw === null ? "—" : Math.round(s.raw)}</td>
                <td className="py-3 text-right">
                  {s.normed ? <NormedFigure n={s.normed} /> : s.self ? <span className="font-mono text-small text-ink">{`${s.self.z >= 0 ? "+" : "−"}${Math.abs(s.self.z).toFixed(1)}`}</span> : <span className="label text-ink-3">pending</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-small text-ink-3">
          {interests.hollandCode ? (
            <>
              Holland code <span className="font-mono text-ink">{interests.hollandCode}</span> (your three highest areas). Spread between highest and
              lowest: <span className="font-mono text-ink">{interests.differentiation}</span> points; overall level{" "}
              <span className="font-mono text-ink">{interests.elevation?.toFixed(1)}</span>.
            </>
          ) : interests.lowDifferentiation ? (
            "Your six interest areas are close together, so no Holland code is assigned. That usually means interests are still forming."
          ) : (
            "Holland code appears when all six areas are complete."
          )}
        </p>
      </div>
    </div>
  );
}
