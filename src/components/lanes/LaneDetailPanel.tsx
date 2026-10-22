"use client";

import { X } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { PayoffCurve } from "@/components/data/PayoffCurve";
import { bandLabel } from "@/lib/matching/fit";
import { WINNER_TAKE_ALL_NOTE, entryLabel, entryNoteText, levelShort, modeLabel, payoffLabel, sprintLabel } from "@/lib/lanes/labels";
import type { LadderRow, LaneDetail, LaneSort, RoleRef } from "@/lib/lanes/types";
import { BandTag, FitIndicator, fitWords } from "./FitIndicator";
import { cn } from "@/lib/cn";

function DriverBar({ value }: { value: number }) {
  // Signed contribution on a −0.6…+0.6 scale (z units), drawn from a centre line.
  const pct = Math.min(1, Math.abs(value) / 0.6) * 50;
  return (
    <div className="relative h-3 w-full" aria-hidden>
      <div className="absolute inset-x-0 top-1/2 h-px bg-rule" />
      <div className="absolute left-1/2 top-0 h-3 w-px bg-ink-4" />
      <div className={cn("absolute top-1/2 h-1 -translate-y-1/2", value >= 0 ? "bg-ink" : "bg-ink-4")} style={value >= 0 ? { left: "50%", width: `${pct}%` } : { right: "50%", width: `${pct}%` }} />
    </div>
  );
}

const roleMeta = (r: RoleRef) => [levelShort[r.level], r.mode !== "employed" ? modeLabel[r.mode] : null].filter(Boolean).join(" · ");

function LadderStep({ row }: { row: LadderRow }) {
  const shown = row.roles.slice(0, 6);
  const more = row.roles.length - shown.length;
  return (
    <li
      className={cn(
        "relative border-l py-3 pl-4",
        row.marker === "start" ? "border-accent" : row.marker === "current" ? "border-ink" : row.marker === "above" ? "border-rule-strong" : "border-rule",
      )}
    >
      <p className="flex flex-wrap items-baseline justify-between gap-x-3">
        {/* The ladder template's wording is specific to this kind of work; the generic level name is the fallback. */}
        <span className={cn("text-small font-medium", row.marker === "below" ? "text-ink-3" : "text-ink")}>{row.step ?? row.levelLabel}</span>
        {row.marker === "start" ? <span className="label text-accent">You&apos;d start here</span> : row.marker === "current" ? <span className="label text-ink">You are here</span> : null}
      </p>
      {row.roles.length ? (
        <p className={cn("mt-1 text-small", row.marker === "below" ? "text-ink-3" : "text-ink-2")}>
          {shown.map((r) => r.title).join(" · ")}
          {more > 0 ? <span className="text-ink-3"> · +{more} more</span> : null}
        </p>
      ) : null}
    </li>
  );
}

export function LaneDetailPanel({ detail, sort, onClose, headingId }: { detail: LaneDetail; sort: LaneSort; onClose: () => void; headingId: string }) {
  const { row } = detail;
  // The path is read bottom-up: the entry point, then the ladder above it.
  const ladder = [...detail.ladder].reverse();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-rule px-6 py-5">
        <div className="min-w-0">
          <p className="label text-ink-3">
            {row.familyName} · {sort === "fit" ? "Relative fit" : "Fit × payoff"}
          </p>
          <h2 id={headingId} className="mt-2 text-h3 font-medium text-ink">
            {row.name}
          </h2>
          <p className="mt-1 label text-ink-3">
            RIASEC {detail.riasec} · {payoffLabel[row.payoff]} · {entryLabel[row.entry]}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close lane detail"
          className="-mr-2 flex size-8 shrink-0 items-center justify-center rounded-xs text-ink-3 transition-quiet hover:bg-rule/60 hover:text-ink"
        >
          <X aria-hidden strokeWidth={1.5} className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6" tabIndex={0} role="region" aria-label="Lane detail">
        {row.payoff === "winner_take_all" ? (
          <p className="mb-6 rounded-sm border border-caution/50 p-3 text-small text-ink">
            <span className="label text-caution">Low median income</span>
            <br />
            {WINNER_TAKE_ALL_NOTE}
          </p>
        ) : null}
        <p className="text-body text-ink-2">{detail.description}</p>

        <section className="mt-8" aria-labelledby={`${headingId}-fit`}>
          <h3 id={`${headingId}-fit`} className="label text-ink-3">
            Fit
          </h3>
          <div className="mt-3 flex items-center gap-3">
            <BandTag band={row.band} />
            <FitIndicator vsAverage={row.vsAverage} se={row.se} className="flex-1" />
          </div>
          <p className="mt-2 text-small text-ink-2">
            {bandLabel[row.band]}: fit is {fitWords(row.vsAverage)}.
            {row.band === "testing" ? " The difference from your other lanes is within measurement error, so trying it is the way to find out." : ""}
          </p>
          {detail.drivers.length ? (
            <>
              <ul className="mt-5 flex flex-col gap-3" aria-label="What drives this fit">
                {detail.drivers.map((d) => (
                  <li key={d.label} className="grid grid-cols-[1fr_96px_48px] items-center gap-3">
                    <span className="text-small text-ink">{d.label.charAt(0).toUpperCase() + d.label.slice(1)}</span>
                    <DriverBar value={d.contribution} />
                    <span className="text-right font-mono text-label text-ink-2">{`${d.contribution >= 0 ? "+" : "−"}${Math.abs(d.contribution).toFixed(2)}`}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-small text-ink-3">Contribution to fit, relative to your own average across all scales.</p>
            </>
          ) : null}
          {detail.unscoredTags.length ? (
            <p className="mt-3 text-small text-ink-3">
              Not counted yet: {detail.unscoredTags.join(", ").toLowerCase()}. The scales behind them are still being validated, or need norm tables before they can be compared.
            </p>
          ) : null}
        </section>

        <section className="mt-8" aria-labelledby={`${headingId}-start`}>
          <h3 id={`${headingId}-start`} className="label text-ink-3">
            Where you&apos;d start
          </h3>
          <p className="mt-3 text-small text-ink-2">{entryNoteText[detail.entryNote]}</p>
          {detail.topRoles.length ? (
            <ol className="mt-4 flex flex-col border-t border-rule">
              {detail.topRoles.map(({ role, reason }) => (
                <li key={role.id} className="border-b border-rule py-3">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-body text-ink">{role.title}</span>
                    <span className="label text-ink-3">{roleMeta(role)}</span>
                  </p>
                  <p className="mt-1 text-small text-ink-2">{reason}</p>
                </li>
              ))}
            </ol>
          ) : null}
        </section>

        <section className="mt-8" aria-labelledby={`${headingId}-path`}>
          <h3 id={`${headingId}-path`} className="label text-ink-3">
            The path · {detail.ladderName}
          </h3>
          <ol className="mt-3" aria-label="Roles by level, most senior first">
            {ladder.map((r) => (
              <LadderStep key={r.level} row={r} />
            ))}
          </ol>
          <p className="mt-3 text-small text-ink-3">Seniority is a path, not a recommendation: Lane never suggests starting in a management role.</p>
        </section>

        {detail.payoffPosition !== null && detail.payoffRange ? (
          <section className="mt-8" aria-labelledby={`${headingId}-payoff`}>
            <h3 id={`${headingId}-payoff`} className="label text-ink-3">
              Payoff structure · {payoffLabel[row.payoff]}
            </h3>
            <div className="mt-4 rounded-sm border border-rule bg-surface p-3">
              <PayoffCurve type={row.payoff} position={detail.payoffPosition} positionCi={detail.payoffRange} />
            </div>
            <p className="mt-3 text-small text-ink-2">{detail.payoffText}</p>
            <p className="mt-2 text-small text-ink-3">Your position is a rough estimate from fit, not a prediction of earnings.</p>
          </section>
        ) : null}

        <section className="mt-8" aria-labelledby={`${headingId}-next`}>
          <h3 id={`${headingId}-next`} className="label text-ink-3">
            Try it · {sprintLabel[row.sprint]}
          </h3>
          <p className="mt-3 text-small text-ink-2">{detail.next.detail}</p>
          <p className="mt-2 text-small text-ink-3">Entry route: {detail.entryText}</p>
        </section>

        {detail.isco.length ? (
          <section className="mt-8" aria-labelledby={`${headingId}-isco`}>
            <h3 id={`${headingId}-isco`} className="label text-ink-3">
              Official occupations (ISCO-08)
            </h3>
            <ul className="mt-3 flex flex-col gap-1 text-small text-ink-3">
              {detail.isco.map((o) => (
                <li key={o.code}>
                  <span className="font-mono">{o.code}</span> {o.label}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <div className="border-t border-rule px-6 py-4">
        <ButtonLink href={detail.next.href} className="w-full">
          {detail.next.label}
        </ButtonLink>
      </div>
    </div>
  );
}
