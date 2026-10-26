import Link from "next/link";
import type { ProfileScores } from "@/lib/scoring/profile";
import { ProfileMark } from "@/components/brand/ProfileMark";
import { keyFigures } from "@/lib/view/findings";
import { cn } from "@/lib/cn";

/**
 * The report you are earning, in miniature: its cover with the mark as far as it is measured, and
 * its chapters filling in. Chapters not unlocked yet are outlined placeholders that say what
 * unlocks them. Read from computed scores only.
 */
export function ReportMiniature({ profile, name, reportId, className }: { profile: ProfileScores; name: string; reportId: string; className?: string }) {
  const f = Object.fromEntries(keyFigures(profile).map((x) => [x.id, x]));
  const chapters = [
    { title: "Interests", unlock: "S1", value: f.interests?.value ?? null },
    { title: "Work values", unlock: "S1", value: f.values?.value ?? null },
    { title: "Personality", unlock: "S2", value: f.personality?.value ?? null },
    { title: "Reasoning", unlock: "S3 + S4", value: profile.reasoning ? (f.reasoning?.value ?? "Scored") : null },
    { title: "Behaviour tasks", unlock: "S4", value: profile.behaviour ? "Scored" : null },
    { title: "Your career fit", unlock: "S1 + S2", value: profile.interests && profile.personality ? "Matched" : null },
  ];
  const done = chapters.filter((c) => c.value !== null).length;
  return (
    <figure className={cn("rounded-sm border border-paper-edge bg-paper p-6", className)} aria-label={`Your report so far: ${done} of ${chapters.length} chapters ready`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-small text-ink-3">Career Profile</p>
          <p className="mt-1 truncate text-h3 font-medium text-ink">{name}</p>
          <p className="mt-1 font-mono text-label text-ink-3">{reportId}</p>
        </div>
        <ProfileMark scores={profile} size={104} decorative className="shrink-0" />
      </div>
      <ol className="mt-6 flex flex-col gap-2">
        {chapters.map((c, i) => (
          <li
            key={c.title}
            className={cn("grid grid-cols-[28px_1fr_auto] items-baseline gap-2 rounded-xs px-3 py-2 text-small", c.value !== null ? "bg-surface text-ink" : "border border-dashed border-rule-strong text-ink-3")}
          >
            <span className="font-mono tabular text-ink-3">{String(i + 1).padStart(2, "0")}</span>
            <span>{c.title}</span>
            <span className={cn("truncate", c.value !== null ? "font-mono text-ink" : "")}>{c.value ?? `Unlocks after ${c.unlock}`}</span>
          </li>
        ))}
      </ol>
      <figcaption className="mt-4 flex items-center justify-between gap-4 text-small text-ink-3">
        <span>
          {done} of {chapters.length} chapters ready
        </span>
        {done ? (
          <Link href="/profile" className="text-ink-2 underline decoration-rule-strong underline-offset-4 hover:text-ink">
            See it so far
          </Link>
        ) : null}
      </figcaption>
    </figure>
  );
}
