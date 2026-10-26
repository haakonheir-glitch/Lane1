import type { WrittenReport as Report } from "@/lib/report/schema";
import { formatIsoDot } from "@/lib/format";

/** A Claude-written report, rendered with its provenance. The scores below it are the source. */
export function WrittenReport({ report, model, createdAt }: { report: Report; model: string; createdAt: Date }) {
  return (
    <article className="max-w-[840px]">
      <p className="text-h2 font-medium text-ink">{report.headline}</p>
      <div className="mt-6 flex flex-col gap-4 text-body-l text-ink-2">
        {report.overview.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {report.sections.map((s) => (
        <section key={s.id} className="mt-10" aria-label={s.title}>
          <h3 className="border-b border-rule pb-2 text-h3 font-medium text-ink">{s.title}</h3>
          <div className="mt-4 flex flex-col gap-3 text-body text-ink-2">
            {s.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      ))}
      {report.pathsToLookInto?.length ? (
        <section className="mt-10" aria-label="Career paths to look into">
          <h3 className="border-b border-rule pb-2 text-h3 font-medium text-ink">Career paths to look into</h3>
          <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-body text-ink-2">
            {report.pathsToLookInto.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {report.caveats.length ? (
        <section className="mt-10 rounded-sm border border-rule bg-surface p-5" aria-label="What this report can't tell you">
          <p className="label text-ink-3">What this report can&apos;t tell you</p>
          <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-small text-ink-2">
            {report.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="mt-6 font-mono text-label uppercase text-ink-3">
        Written by Claude ({model}) from the scores below · {formatIsoDot(createdAt.toISOString().slice(0, 10))} · it can be wrong; the scores are the source
      </p>
    </article>
  );
}
