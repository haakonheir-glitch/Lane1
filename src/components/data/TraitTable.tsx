import type { Trait } from "@/lib/types";
import { ciHalf, fmtPercentile } from "@/lib/format";
import { ScoreBar } from "./ScoreBar";

/** Lab-report table of Big Five traits. Stacks into rows below 768px. */
export function TraitTable({ traits, caption }: { traits: Trait[]; caption?: string }) {
  return (
    <div>
      <table className="hidden w-full border-collapse text-left md:table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-rule-strong">
            <th scope="col" className="w-[18%] py-2 pr-4 label font-normal text-ink-3">Trait</th>
            <th scope="col" className="w-[16%] py-2 pr-4 label font-normal text-ink-3">Score</th>
            <th scope="col" className="w-[22%] py-2 pr-6 label font-normal text-ink-3">
              <span aria-hidden>0 — 100</span>
              <span className="sr-only">Score bar</span>
            </th>
            <th scope="col" className="w-[8%] py-2 pr-4 label font-normal text-ink-3">Pct</th>
            <th scope="col" className="py-2 label font-normal text-ink-3">Interpretation</th>
          </tr>
        </thead>
        <tbody>
          {traits.map((t) => (
            <tr key={t.key} className="border-b border-rule align-middle">
              <th scope="row" className="py-4 pr-4 text-body font-normal text-ink">{t.label}</th>
              <td className="py-4 pr-4 font-mono text-small text-ink">
                {t.score.value} <span className="text-label text-ink-3">/100 ±{ciHalf(t.score)}</span>
              </td>
              <td className="py-4 pr-6">
                <ScoreBar score={t.score} label={`${t.label} score`} />
              </td>
              <td className="py-4 pr-4 font-mono text-small text-ink-2">
                {t.score.percentile !== undefined ? fmtPercentile(t.score.percentile) : "—"}
              </td>
              <td className="py-4 text-small text-ink-2">{t.interpretation}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="border-t border-rule-strong md:hidden">
        {traits.map((t) => (
          <li key={t.key} className="flex flex-col gap-2 border-b border-rule py-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-body text-ink">{t.label}</span>
              <span className="font-mono text-small text-ink">
                {t.score.value} <span className="text-label text-ink-3">±{ciHalf(t.score)}</span>
                {t.score.percentile !== undefined ? (
                  <span className="ml-3 text-label text-ink-3">{fmtPercentile(t.score.percentile)}</span>
                ) : null}
              </span>
            </div>
            <ScoreBar score={t.score} label={`${t.label} score`} />
            <p className="text-small text-ink-2">{t.interpretation}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
