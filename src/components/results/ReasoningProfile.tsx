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
        <p className="label text-ink-3">General reasoning · 90% interval</p>
        {reasoning.generalAbility ? (
          <>
            <p className="mt-3 font-mono text-h2 text-ink">
              P{reasoning.generalAbility.percentileBand[0]}–{reasoning.generalAbility.percentileBand[1]}
            </p>
            <div className="relative mt-4 h-2 bg-rule" aria-hidden>
              <div
                className="absolute inset-y-0 bg-ink opacity-60"
                style={{ left: `${reasoning.generalAbility.percentileBand[0]}%`, width: `${reasoning.generalAbility.percentileBand[1] - reasoning.generalAbility.percentileBand[0]}%` }}
              />
              <div className="absolute -top-1 h-4 w-px bg-ink-4" style={{ left: "50%" }} />
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
