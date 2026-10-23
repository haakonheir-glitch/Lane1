import type { ProfileScores } from "@/lib/scoring/profile";
import { relativeOf } from "@/lib/view/profile";
import { NormedBar, NormedFigure } from "./NormedBar";
import { RelativeTag } from "./RelativeTag";

/**
 * Reasoning profile (file 14 composite_scores): relative strengths across five areas and one
 * general-ability percentile BAND with a 90% interval. Never an IQ number.
 */
export function ReasoningProfile({ reasoning }: { reasoning: NonNullable<ProfileScores["reasoning"]> }) {
  const rel = relativeOf(reasoning.areas);
  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <p className="label text-ink-3">General reasoning · 90% range</p>
        {reasoning.generalAbility ? (
          <>
            <p className="mt-4 font-mono text-figure font-medium tabular text-ink">
              P{reasoning.generalAbility.percentileBand[0]}–{reasoning.generalAbility.percentileBand[1]}
            </p>
            {/* Percentile scale 0–100: the 90% range as a solid band, the median as a full-height tick. */}
            <div className="mt-5" aria-hidden>
              <div className="relative h-4">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-rule-strong" />
                {[0, 25, 75, 100].map((t) => (
                  <div key={t} className="absolute top-1/2 h-1.5 w-px -translate-y-1/2 bg-rule-strong" style={{ left: `${t}%` }} />
                ))}
                <div
                  className="absolute top-1/2 h-2 -translate-y-1/2 bg-ink"
                  style={{ left: `${reasoning.generalAbility.percentileBand[0]}%`, width: `${Math.max(1, reasoning.generalAbility.percentileBand[1] - reasoning.generalAbility.percentileBand[0])}%` }}
                />
                <div className="absolute inset-y-0 w-px bg-data-ref" style={{ left: "50%" }} />
              </div>
              <div className="mt-1 flex justify-between font-mono text-[11px] text-ink-3">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-3 text-small text-ink-2">Not enough scored items to estimate a range.</p>
        )}
        {reasoning.norms?.provisional ? (
          <p className="mt-4 text-small text-ink-2">
            <span className="label text-ink-3">Provisional norms · </span>
            Compared with adults 18–35 in Norway, using difficulty estimates made before Lane had pilot data. Ranges may shift once real
            results are in.
          </p>
        ) : null}
        <p className="mt-4 text-small text-ink-3">
          A range, not a single number, and never an IQ score: an online, unproctored test can&apos;t support one, and a single figure says
          more to people about themselves than the evidence warrants.
        </p>
      </div>
      <ul className="lg:col-span-8">
        {reasoning.areas.map((a) => (
          <li key={a.id} className="flex flex-col gap-2 border-b border-rule py-4 first:border-t first:border-t-rule-strong">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="text-body text-ink">{a.label}</span>
                <RelativeTag r={rel[a.id] ?? "none"} />
              </span>
              {a.normed ? <NormedFigure n={a.normed} /> : <span className="label text-ink-3">not enough data</span>}
            </div>
            {a.normed ? <NormedBar n={a.normed} label={`${a.label} score`} /> : null}
            <p className="text-small text-ink-3">
              {a.summary}
              {a.normed && a.normConfidence === "low" ? " · rough estimate" : ""}
            </p>
          </li>
        ))}
        <li className="pt-3 text-small text-ink-3">
          Tags appear only where the gap between two of your own scores is larger than the measurement error of that difference.
        </li>
      </ul>
    </div>
  );
}
