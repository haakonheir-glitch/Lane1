"use client";

import { X } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { ConfidenceBadge } from "@/components/data/ConfidenceBadge";
import { DataLabel } from "@/components/data/DataLabel";
import { PayoffCurve } from "@/components/data/PayoffCurve";
import { ciHalf, groupLabel, pad2 } from "@/lib/format";
import { payoffDescription, payoffLabel } from "@/lib/scoring";
import type { LaneSort, RankedLane, Sprint } from "@/lib/types";
import { cn } from "@/lib/cn";

function DriverBar({ value }: { value: number }) {
  // Signed contribution on a −0.4…+0.4 scale, drawn from a centre line.
  const pct = Math.min(1, Math.abs(value) / 0.4) * 50;
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

export function LaneDetailPanel({
  lane,
  sort,
  sprint,
  onClose,
  headingId,
}: {
  lane: RankedLane;
  sort: LaneSort;
  sprint?: Sprint;
  onClose: () => void;
  headingId: string;
}) {
  const sprintCta =
    sprint?.status === "active"
      ? { href: `/sprints/${sprint.id}`, label: "Open active sprint" }
      : sprint?.status === "completed"
        ? { href: `/sprints/${sprint.id}`, label: "View completed sprint" }
        : { href: sprint ? `/sprints/${sprint.id}` : "/sprints", label: "Start a sprint" };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-rule px-6 py-5">
        <div className="min-w-0">
          <p className="label text-ink-3">
            Rank {lane.tied ? "=" : ""}
            {pad2(lane.rank)} · {sort === "fit" ? "Relative fit" : "Fit × payoff"}
          </p>
          <h2 id={headingId} className="mt-2 text-h3 font-medium text-ink">
            {lane.name}
          </h2>
          <p className="mt-1 label text-ink-3">
            {groupLabel[lane.group]} · {payoffLabel[lane.payoff]}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close lane detail"
          className="-mr-2 flex size-8 items-center justify-center rounded-xs text-ink-3 transition-quiet hover:bg-rule/60 hover:text-ink"
        >
          <X aria-hidden strokeWidth={1.5} className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6" tabIndex={0} role="region" aria-label="Lane detail">
        <p className="text-body text-ink-2">{lane.summary}</p>

        <div className={cn("mt-6 grid gap-4 border-y border-rule py-4", sort === "fit" ? "grid-cols-2" : "grid-cols-3")}>
          <DataLabel layout="stacked" label="Relative fit" value={Math.round(lane.relativeFit.value)} unit="/100" pm={ciHalf(lane.relativeFit)} />
          {sort === "fit-payoff" ? (
            <DataLabel layout="stacked" label="Fit × payoff" value={Math.round(lane.sortScore.value)} unit="/100" pm={ciHalf(lane.sortScore)} />
          ) : null}
          <div className="flex flex-col gap-1">
            <span className="label text-ink-3">Confidence</span>
            <ConfidenceBadge level={lane.confidence} className="h-7" />
          </div>
        </div>

        <section className="mt-8" aria-labelledby={`${headingId}-why`}>
          <h3 id={`${headingId}-why`} className="label text-ink-3">
            Why it ranks here
          </h3>
          <ul className="mt-4 flex flex-col gap-3">
            {lane.drivers.map((d) => (
              <li key={d.label} className="grid grid-cols-[1fr_96px_48px] items-center gap-3">
                <span className="text-small text-ink">{d.label}</span>
                <DriverBar value={d.contribution} />
                <span className="text-right font-mono text-label text-ink-2">
                  {d.contribution === 0 ? "n/a" : `${d.contribution > 0 ? "+" : "−"}${Math.abs(d.contribution).toFixed(2)}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-small text-ink-3">Contribution to relative fit, as a share of your own score spread.</p>
        </section>

        <section className="mt-8" aria-labelledby={`${headingId}-payoff`}>
          <h3 id={`${headingId}-payoff`} className="label text-ink-3">
            Payoff structure · {payoffLabel[lane.payoff]}
          </h3>
          <div className="mt-4 rounded-sm border border-rule bg-surface p-3">
            <PayoffCurve type={lane.payoff} position={lane.payoffPosition} positionCi={lane.payoffPositionCi} />
          </div>
          <p className="mt-3 text-small text-ink-2">{payoffDescription[lane.payoff]}</p>
          <p className="mt-2 font-mono text-label text-ink-3">
            EST. POSITION P{Math.round(lane.payoffPosition * 100)} · RANGE P{Math.round(lane.payoffPositionCi[0] * 100)}–P
            {Math.round(lane.payoffPositionCi[1] * 100)} · AT A REALISTIC SKILL LEVEL AFTER 3–5 YEARS
          </p>
        </section>

        <section className="mt-8" aria-labelledby={`${headingId}-similar`}>
          <h3 id={`${headingId}-similar`} className="label text-ink-3">
            What similar profiles did
          </h3>
          <div className="mt-4 flex flex-col gap-2 border-t border-rule pt-3">
            <DataLabel label="Similar profiles" value={lane.similar.n.toLocaleString("en-US")} unit="n" />
            <DataLabel label="Tried a sprint" value={lane.similar.triedPct} unit="%" />
            <DataLabel label="Continued after" value={lane.similar.continuedPct} unit="%" />
          </div>
          <p className="mt-3 text-small text-ink-2">{lane.similar.note}</p>
        </section>
      </div>

      <div className="border-t border-rule px-6 py-4">
        <ButtonLink href={sprintCta.href} className="w-full">
          {sprintCta.label}
        </ButtonLink>
      </div>
    </div>
  );
}
