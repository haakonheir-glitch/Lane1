import type { ScaleScore } from "@/lib/scoring/types";
import { interpret, relativeOf } from "@/lib/view/profile";
import { NormedBar, NormedFigure } from "./NormedBar";
import { RelativeTag } from "./RelativeTag";

/**
 * Big Five domains (with relative-strength tags), each expandable to its facets.
 * Facets are shown with their (wide) intervals and never without them (file 01 precision_note).
 */
export function ScaleTable({ domains, facets, extra }: { domains: ScaleScore[]; facets: ScaleScore[]; extra?: ScaleScore | null }) {
  const rel = relativeOf(domains);
  const expandable = facets.length > 0;
  const facetsOf = (d: string) => facets.filter((f) => f.id.startsWith(d[0]!));
  return (
    <div className="border-t border-rule-strong">
      <div className="hidden grid-cols-[minmax(0,1.1fr)_150px_minmax(0,1fr)_minmax(0,1.6fr)] gap-x-6 border-b border-rule py-2 md:grid">
        {["Domain", "Score · 90%", "T 20 — 80", "Interpretation"].map((h) => (
          <span key={h} className="label text-ink-3">
            {h}
          </span>
        ))}
      </div>
      {domains.map((d) => (
        <details key={d.id} className="group border-b border-rule" {...(expandable ? {} : { open: false })}>
          <summary className="grid list-none cursor-pointer grid-cols-1 gap-x-6 gap-y-2 py-4 md:grid-cols-[minmax(0,1.1fr)_150px_minmax(0,1fr)_minmax(0,1.6fr)] md:items-center [&::-webkit-details-marker]:hidden">
            <span className="flex flex-wrap items-center gap-2">
              {expandable ? <span aria-hidden className="font-mono text-small text-ink-3 transition-quiet group-open:rotate-90">›</span> : null}
              <span className="text-body text-ink">{d.label}</span>
              <RelativeTag r={rel[d.id] ?? "none"} />
            </span>
            {d.normed ? <NormedFigure n={d.normed} /> : <span className="font-mono text-small text-ink-3">{d.raw?.toFixed(2) ?? "—"} raw</span>}
            {d.normed ? <NormedBar n={d.normed} label={`${d.label} score`} /> : <span />}
            <span className="text-small text-ink-2">{interpret(d.id, d.normed)}</span>
          </summary>
          {expandable ? <ul className="mb-4 ml-0 border-l border-rule pl-4 md:ml-6">
            {facetsOf(d.id).map((f) => (
              <li key={f.id} className="grid grid-cols-1 gap-x-6 gap-y-1 py-2 md:grid-cols-[minmax(0,1.1fr)_150px_minmax(0,1fr)_minmax(0,1.6fr)] md:items-center">
                <span className="text-small text-ink">
                  <span className="mr-2 font-mono text-label text-ink-3">{f.id}</span>
                  {f.label}
                </span>
                {f.normed ? <NormedFigure n={f.normed} /> : <span className="font-mono text-label text-ink-3">{f.raw?.toFixed(2) ?? "not enough answers"}</span>}
                {f.normed ? <NormedBar n={f.normed} label={`${f.label} facet score`} /> : <span />}
                <span className="text-label text-ink-3">{f.answered}/{f.items} answered</span>
              </li>
            ))}
          </ul> : null}
        </details>
      ))}
      {extra ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 border-b border-rule py-4 md:grid-cols-[minmax(0,1.1fr)_150px_minmax(0,1fr)_minmax(0,1.6fr)] md:items-center">
          <span className="text-body text-ink md:pl-5">{extra.label}</span>
          {extra.normed ? <NormedFigure n={extra.normed} /> : <span className="font-mono text-small text-ink-3">{extra.raw?.toFixed(2) ?? "—"} raw</span>}
          {extra.normed ? <NormedBar n={extra.normed} label={`${extra.label} score`} /> : <span />}
          <span className="text-small text-ink-2">{interpret(extra.id, extra.normed)}</span>
        </div>
      ) : null}
    </div>
  );
}
