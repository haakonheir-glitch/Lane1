import type { ScaleScore } from "@/lib/scoring/types";
import { interpret, relativeOf } from "@/lib/view/profile";
import { NormedBar, NormedFigure, SelfBar, SelfFigure } from "./NormedBar";
import { RelativeTag } from "./RelativeTag";

/**
 * Big Five domains (with relative-strength tags), each expandable to its facets.
 * Facets are shown with their (wide) intervals and never without them (file 01 precision_note).
 */
export function ScaleTable({ domains, facets, extra }: { domains: ScaleScore[]; facets: ScaleScore[]; extra?: ScaleScore | null }) {
  const rel = relativeOf(domains);
  const expandable = facets.length > 0;
  const facetsOf = (d: string) => facets.filter((f) => f.id.startsWith(d[0]!));
  // Without population norms, scores are shown relative to the person's own other scales.
  const selfMode = !domains.some((d) => d.normed) && domains.some((d) => d.self);
  const figure = (x: ScaleScore, small?: boolean) =>
    x.normed ? <NormedFigure n={x.normed} /> : x.self ? <SelfFigure raw={x.raw} s={x.self} /> : <span className={small ? "font-mono text-label text-ink-3" : "font-mono text-small text-ink-3"}>{x.raw?.toFixed(2) ?? (small ? "not enough answers" : "—")} raw</span>;
  const bar = (x: ScaleScore, label: string) => (x.normed ? <NormedBar n={x.normed} label={label} /> : x.self ? <SelfBar s={x.self} label={label} /> : <span />);
  return (
    <div className="border-t border-rule-strong">
      <div className="hidden grid-cols-[minmax(0,1.1fr)_150px_minmax(0,1fr)_minmax(0,1.6fr)] gap-x-6 border-b border-rule py-2 md:grid">
        {(selfMode ? ["Domain", "vs your average", "Your own range · 90%", "Reading"] : ["Domain", "Score · 90%", "T 20 — 80", "Interpretation"]).map((h) => (
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
            {figure(d)}
            {bar(d, `${d.label} score`)}
            <span className="text-small text-ink-2">{interpret(d.id, d.normed, d.self)}</span>
          </summary>
          {expandable ? <ul className="mb-4 ml-0 border-l border-rule pl-4 md:ml-6">
            {facetsOf(d.id).map((f) => (
              <li key={f.id} className="grid grid-cols-1 gap-x-6 gap-y-1 py-2 md:grid-cols-[minmax(0,1.1fr)_150px_minmax(0,1fr)_minmax(0,1.6fr)] md:items-center">
                <span className="text-small text-ink">
                  <span className="mr-2 font-mono text-label text-ink-3">{f.id}</span>
                  {f.label}
                </span>
                {figure(f, true)}
                {bar(f, `${f.label} facet score`)}
                <span className="text-label text-ink-3">{f.answered}/{f.items} answered</span>
              </li>
            ))}
          </ul> : null}
        </details>
      ))}
      {extra ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 border-b border-rule py-4 md:grid-cols-[minmax(0,1.1fr)_150px_minmax(0,1fr)_minmax(0,1.6fr)] md:items-center">
          <span className="text-body text-ink md:pl-5">{extra.label}</span>
          {figure(extra)}
          {bar(extra, `${extra.label} score`)}
          <span className="text-small text-ink-2">{extra.normed ? interpret(extra.id, extra.normed) : "A single scale, so it can't be compared with your own other scores; it needs population norms."}</span>
        </div>
      ) : null}
    </div>
  );
}
