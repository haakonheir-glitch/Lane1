"use client";

import { X } from "lucide-react";
import { entryLabel, entryNoteText, entryTerm, levelShort, modeLabel } from "@/lib/lanes/labels";
import type { FitDriver, LadderRow, LaneDetail, LaneDetailV2, RoleRef } from "@/lib/lanes/types";
import { BandTag } from "./FitIndicator";
import { FitRangeBar, fitText } from "./FitRangeBar";
import { DimensionIntervals } from "@/components/workdesign/DimensionIntervals";
import { cn } from "@/lib/cn";
import { BRAND } from "@/lib/brand";

function DriverBar({ value, max }: { value: number; max: number }) {
  // Signed contribution on a −max…+max scale (fulfilment points), drawn from a centre line.
  const pct = Math.min(1, Math.abs(value) / max) * 50;
  return (
    <div className="relative h-3 w-full" aria-hidden>
      <div className="absolute inset-x-0 top-1/2 h-px bg-rule" />
      <div className="absolute left-1/2 top-0 h-3 w-px bg-ink-4" />
      <div
        className={cn("absolute top-1/2 h-1 -translate-y-1/2", value >= 0 ? "bg-ink" : "bg-ink-4")}
        style={value >= 0 ? { left: "50%", width: `${pct}%` } : { right: "50%", width: `${pct}%` }}
      />
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** v2 drivers or frictions, in fulfilment points against your average career path. */
function DriverList({ items, label }: { items: FitDriver[]; label: string }) {
  return (
    <ul className="mt-3 flex flex-col gap-3" aria-label={label}>
      {items.map((d) => (
        <li key={d.id} className="grid grid-cols-[1fr_80px_40px] items-center gap-3">
          <span className="text-small text-ink">{cap(d.label)}</span>
          <DriverBar value={d.contribution} max={5} />
          <span className="text-right font-mono text-label text-ink-2">{`${d.contribution >= 0 ? "+" : "−"}${Math.abs(d.contribution).toFixed(1)}`}</span>
        </li>
      ))}
    </ul>
  );
}

/** Matching v2's view of the career path: both fits with their ranges, why it fits, where it rubs, and you against it. */
function FitV2({ v2, row, headingId }: { v2: LaneDetailV2; row: LaneDetail["row"]; headingId: string }) {
  const modes = v2.dims.filter((d) => d.group === "mode");
  const conditions = v2.dims.filter((d) => d.group === "condition");
  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <BandTag band={row.band} />
        <span className="text-small text-ink-2">
          In your top 10% in {Math.round(v2.pTop * 100)}% of draws{v2.bothWeightings ? ", under either way of weighting working conditions" : ""}
        </span>
      </div>
      <dl className="mt-4 grid gap-4">
        <div>
          <dt className="flex justify-between gap-3 text-small text-ink">
            Fulfilment fit <span className="font-mono text-label text-ink-3">{v2.fulfilment ? fitText(v2.fulfilment) : "not enough data"}</span>
          </dt>
          <dd className="mt-1">
            <FitRangeBar range={v2.fulfilment} kind="fulfilment" label="Fulfilment fit" />
            <p className="mt-1 text-label text-ink-3">Does the work give you what you need? 50 is your average career path.</p>
          </dd>
        </div>
        <div>
          <dt className="flex justify-between gap-3 text-small text-ink">
            Ability fit <span className="font-mono text-label text-ink-3">{v2.ability ? fitText(v2.ability) : "not enough reasoning data"}</span>
          </dt>
          <dd className="mt-1">
            <FitRangeBar range={v2.ability} kind="ability" label="Ability fit" />
            <p className="mt-1 text-label text-ink-3">Can you meet what it demands? 100 means nothing beyond your measured reasoning range.</p>
          </dd>
        </div>
      </dl>

      <h4 id={`${headingId}-why`} className="mt-6 text-small font-medium text-ink">
        Why it fits
      </h4>
      {v2.drivers.length ? (
        <DriverList items={v2.drivers} label="Why it fits" />
      ) : (
        <p className="mt-2 text-small text-ink-3">Nothing lifts it clearly above your average career path.</p>
      )}
      <h4 id={`${headingId}-rubs`} className="mt-5 text-small font-medium text-ink">
        Where it rubs
      </h4>
      {v2.frictions.length ? (
        <DriverList items={v2.frictions} label="Where it rubs" />
      ) : (
        <p className="mt-2 text-small text-ink-3">Nothing pulls it clearly below your average career path.</p>
      )}
      <p className="mt-3 text-small text-ink-3">Fulfilment points, against the same part averaged over all your career paths.</p>

      <h4 className="mt-6 text-small font-medium text-ink">You and this career path</h4>
      <p className="mt-1 text-small text-ink-3">
        Blue is you: your score and its 90% range. The dark tick is the career&apos;s level from O*NET data. Your scores sit on the questionnaire scales and the career&apos;s are
        percentiles across occupations, so read them side by side, not as one ruler.
      </p>
      <p className="mt-4 label text-ink-3">Value modes</p>
      <div className="mt-2">
        <DimensionIntervals
          compact
          label="Value modes: you and this career path"
          markerLabel="This career path"
          markerShort="career"
          rows={modes.map((d) => ({ id: d.id, name: d.name, archetype: d.archetype, poles: d.poles, value: d.you, lo: d.lo, hi: d.hi, marker: d.career }))}
        />
      </div>
      <p className="mt-4 label text-ink-3">Working conditions</p>
      <div className="mt-2">
        <DimensionIntervals
          compact
          label="Working conditions: you and this career path"
          markerLabel="This career path"
          markerShort="career"
          rows={conditions.map((d) => ({ id: d.id, name: d.name, poles: d.poles, value: d.you, lo: d.lo, hi: d.hi, marker: d.career }))}
        />
      </div>
    </>
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
        {row.marker === "start" ? (
          <span className="label text-accent">You&apos;d start here</span>
        ) : row.marker === "current" ? (
          <span className="label text-ink">You are here</span>
        ) : null}
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

export function LaneDetailPanel({ detail, onClose, headingId }: { detail: LaneDetail; onClose: () => void; headingId: string }) {
  const { row } = detail;
  // The path is read bottom-up: the entry point, then the ladder above it.
  const ladder = [...detail.ladder].reverse();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-rule px-6 py-5">
        <div className="min-w-0">
          <p className="label text-ink-3">
            {row.familyName} · Relative fit
            {row.provenance === "estimated" ? <span className="text-caution"> · Estimated career data</span> : null}
          </p>
          <h2 id={headingId} className="mt-2 text-h3 font-medium text-ink">
            {row.name}
          </h2>
          <p className="mt-1 label text-ink-3">
            RIASEC {detail.riasec} · {entryLabel[row.entry]}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close career path detail"
          className="-mr-2 flex size-8 shrink-0 items-center justify-center rounded-xs text-ink-3 transition-quiet hover:bg-rule/60 hover:text-ink"
        >
          <X aria-hidden strokeWidth={1.5} className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6" tabIndex={0} role="region" aria-label="Career path detail">
        <p className="text-body text-ink-2">{detail.description}</p>

        {detail.day && detail.day.activities.length ? (
          <section className="mt-8" aria-labelledby={`${headingId}-day`}>
            <h3 id={`${headingId}-day`} className="label text-ink-3">
              A typical day in this career
            </h3>
            <ul className="mt-3 flex flex-col gap-3">
              {detail.day.activities.map((a) => (
                <li key={a.id}>
                  <p className="text-small text-ink">{a.name}</p>
                  <p className="text-small text-ink-3">{a.description}</p>
                </li>
              ))}
            </ul>
            {detail.day.context.length ? (
              <dl className="mt-4 flex flex-col gap-2 border-t border-rule pt-3 text-small">
                {detail.day.context.map((c) => (
                  <div key={c.id} className="flex flex-wrap justify-between gap-x-3">
                    <dt className="text-ink-2">{c.name}</dt>
                    {c.label ? <dd className="text-ink-3">{c.label}</dd> : null}
                  </div>
                ))}
              </dl>
            ) : null}
            <p className="mt-3 text-label text-ink-3">
              The work activities and conditions this career stands out on compared with other occupations, from O*NET data
              {detail.day.provenance === "estimated" ? ", estimated from similar occupations" : ""}.
            </p>
          </section>
        ) : null}

        <section className="mt-8 rounded-sm border border-rule bg-bg p-4" aria-labelledby={`${headingId}-about`}>
          <h3 id={`${headingId}-about`} className="label text-ink-3">
            About this career path
          </h3>
          <dl className="mt-3 flex flex-col gap-3 text-small">
            {detail.day?.activities.length ? null : (
              <div>
                <dt className="text-ink">Day to day</dt>
                <dd className="text-ink-2">{detail.dayToDay.join(" · ")}</dd>
              </div>
            )}
            <div>
              <dt className="text-ink">How people get in</dt>
              <dd className="text-ink-2">
                <span title={`Entry: ${entryTerm[row.entry]}`}>{entryLabel[row.entry]}</span>. {detail.entryText}
              </dd>
            </div>
            <div>
              <dt className="text-ink">Realistic starting role</dt>
              <dd className="text-ink-2">{detail.topRoles[0] ? detail.topRoles[0].role.title : entryNoteText[detail.entryNote]}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-8" aria-labelledby={`${headingId}-fit`}>
          <h3 id={`${headingId}-fit`} className="label text-ink-3">
            Fit
          </h3>
          <FitV2 v2={detail.v2} row={row} headingId={headingId} />
        </section>

        <section className="mt-8" aria-labelledby={`${headingId}-start`}>
          <h3 id={`${headingId}-start`} className="label text-ink-3">
            Where you&apos;d start
          </h3>
          <p className="mt-3 text-small text-ink-2">{entryNoteText[detail.entryNote]}</p>
          {detail.topRoles.length ? (
            <ol className="mt-4 flex flex-col border-t border-rule">
              {detail.topRoles.map(({ role, reason, note }) => (
                <li key={role.id} className="border-b border-rule py-3">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-body text-ink">{role.title}</span>
                    <span className="label text-ink-3">{roleMeta(role)}</span>
                  </p>
                  <p className="mt-1 text-small text-ink-2">{reason}</p>
                  {note ? <p className="mt-1 text-small text-caution">{note}</p> : null}
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
          <p className="mt-3 text-small text-ink-3">Seniority is a path, not a recommendation: {BRAND.name} never suggests starting in a management role.</p>
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
    </div>
  );
}
