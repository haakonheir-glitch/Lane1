import Link from "next/link";
import type { ProfileScores } from "@/lib/scoring/profile";
import { groupDirections, type CareerPick } from "@/lib/lanes/types";
import { ProfileMark } from "@/components/brand/ProfileMark";
import { keyFigures } from "@/lib/view/findings";
import { pad2 } from "@/lib/format";
import { cn } from "@/lib/cn";
import { EQUAL_FIT_LINE } from "@/components/lanes/Directions";
import { Paper } from "./Paper";

/**
 * The one-page summary: the mark and four headline figures, the directions (career paths unnumbered,
 * owner's decision 2026-10-30) in the screen's one inverted panel, and three brief lines. Works on its own as a printout.
 */
export function SummarySheet({ profile, name, paths, brief, reportId }: { profile: ProfileScores; name: string; paths: CareerPick[]; brief: string[]; reportId: string }) {
  const figures = keyFigures(profile);
  return (
    <Paper id="summary" label="Summary" className="p-8 sm:p-12">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-h3 font-medium text-ink">Summary</h2>
        <p className="font-mono text-label text-ink-3">
          {name} <span className="px-1 text-ink-4">·</span> {reportId}
        </p>
      </div>

      <div className="mt-8 grid items-center gap-10 md:grid-cols-[200px_minmax(0,1fr)]">
        <ProfileMark scores={profile} size={200} decorative className="mx-auto" />
        <dl className="grid grid-cols-2 gap-x-8 gap-y-6">
          {figures.map((f) => (
            <div key={f.id} className="min-w-0 border-t border-rule pt-3">
              <dt className="text-small text-ink-3">{f.label}</dt>
              <dd className={cn("mt-1 truncate font-medium text-ink", f.id === "interests" || f.id === "reasoning" ? "font-mono text-[34px] leading-[40px] tabular tracking-[-0.02em]" : "text-[28px] leading-[40px] tracking-[-0.015em]", f.value === null && "text-ink-4")}>
                {f.value ?? "—"}
              </dd>
              <dd className="mt-1 text-small text-ink-2">{f.detail}</dd>
            </div>
          ))}
        </dl>
      </div>

      {paths.length ? (
        <section aria-labelledby="sum-paths" className="doc-panel mt-10 bg-panel p-6 text-panel-ink sm:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <h3 id="sum-paths" className="text-body font-medium">Your directions</h3>
            <Link href="/lanes" className="text-small text-panel-ink-2 underline decoration-panel-rule underline-offset-4 hover:text-panel-ink">
              Open your Career map
            </Link>
          </div>
          <ul className="mt-4">
            {groupDirections(paths).map((d, i) => (
              <li key={d.id} className={cn("py-4", i > 0 && "border-t border-panel-rule")}>
                <p className="text-small text-panel-ink-2">{d.name}</p>
                <p className="mt-1 text-[20px] leading-[28px] font-medium">
                  {d.picks.map((p, j) => (
                    <span key={p.row.id}>
                      {j > 0 ? <span className="text-panel-ink-2"> · </span> : null}
                      <Link href={`/lanes?lane=${p.row.id}`} className="hover:underline hover:underline-offset-4">
                        {p.row.name}
                      </Link>
                      {p.row.provenance === "estimated" ? <span className="label ml-2 align-middle text-panel-ink-2">Estimated career data</span> : null}
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-small text-panel-ink-2">{EQUAL_FIT_LINE}</p>
        </section>
      ) : null}

      <section aria-labelledby="sum-brief" className="mt-10">
        <h3 id="sum-brief" className="text-body font-medium text-ink">In brief</h3>
        <ol className="mt-3 flex flex-col gap-3">
          {brief.slice(0, 3).map((s, i) => (
            <li key={i} className="grid grid-cols-[40px_1fr] text-body-l text-ink">
              <span className="pt-1 font-mono text-small text-ink-3 tabular">{pad2(i + 1)}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-10 border-t border-rule pt-4 text-small text-ink-3">
        Measured with validated instruments. Every score is shown with its 90% range; what the results can&apos;t tell you is in{" "}
        <a href="#method" className="text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink">
          Method and limits
        </a>
        .
      </p>
    </Paper>
  );
}
