import Link from "next/link";
import type { ProfileScores } from "@/lib/scoring/profile";
import type { CareerPick } from "@/lib/lanes/types";
import { ProfileMark } from "@/components/brand/ProfileMark";
import { bandLabel } from "@/lib/matching/fit";
import { keyFigures } from "@/lib/view/findings";
import { pad2 } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Paper } from "./Paper";

/**
 * The one-page summary: the mark and four headline figures, the top three career paths in the
 * screen's one inverted panel, and three brief lines. Works on its own as a printout.
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
            <h3 id="sum-paths" className="text-body font-medium">Your closest career paths</h3>
            <Link href="/lanes" className="text-small text-panel-ink-2 underline decoration-panel-rule underline-offset-4 hover:text-panel-ink">
              Open your Career map
            </Link>
          </div>
          <ol className="mt-4">
            {paths.slice(0, 3).map((p, i) => (
              <li key={p.row.id} className={cn("grid grid-cols-[40px_minmax(0,1fr)_auto] items-baseline gap-x-3 py-4", i > 0 && "border-t border-panel-rule")}>
                <span className="font-mono text-small text-panel-ink-2 tabular">{pad2(i + 1)}</span>
                <span className="min-w-0">
                  <Link href={`/lanes?lane=${p.row.id}`} className="text-[20px] leading-[28px] font-medium hover:underline hover:underline-offset-4">
                    {p.row.name}
                  </Link>
                  {p.role ? <span className="mt-0.5 block text-small text-panel-ink-2">Start as {p.role.title}</span> : null}
                </span>
                <span className="rounded-xs border border-panel-ink-2 px-2 py-0.5 text-label whitespace-nowrap">{bandLabel[p.row.band]}</span>
              </li>
            ))}
          </ol>
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
