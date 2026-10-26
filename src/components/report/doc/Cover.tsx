import type { ReactNode } from "react";
import type { ProfileScores } from "@/lib/scoring/profile";
import { ProfileMarkWithLegend } from "@/components/brand/ProfileMark";
import { Wordmark } from "@/components/shell/Wordmark";
import { Paper } from "./Paper";

/** The report's cover: whose it is, when, the Profile Mark, and how much measurement it rests on. */
export function Cover({
  profile,
  name,
  reportId,
  date,
  effort,
  status,
  reveal,
}: {
  profile: ProfileScores;
  name: string;
  reportId: string;
  date: string;
  effort: string;
  /** A quiet status in the metadata line, e.g. "Sample" or "Updating…". */
  status?: ReactNode;
  reveal?: boolean;
}) {
  return (
    <Paper as="header" id="cover" label="Cover" className="doc-cover grid min-h-[560px] grid-rows-[auto_1fr_auto] p-8 sm:p-12">
      <div className="flex items-baseline justify-between gap-4">
        <Wordmark href={null} />
        <p className="font-mono text-label text-ink-3 tabular">
          {reportId} <span className="px-1 text-ink-4">·</span> {date}
          {status}
        </p>
      </div>
      <div className="grid items-center gap-10 py-10 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className={reveal ? "doc-reveal-name" : undefined}>
          <p className="text-small text-ink-3">Career Profile</p>
          <h1 className="mt-3 text-[56px] leading-[60px] font-medium tracking-[-0.03em] text-ink md:text-[72px] md:leading-[74px]">{name}</h1>
        </div>
        <ProfileMarkWithLegend scores={profile} size={300} reveal={reveal} className="justify-self-center" />
      </div>
      <p className="border-t border-rule pt-4 font-mono text-small text-ink-2 tabular">Built from {effort}</p>
    </Paper>
  );
}
