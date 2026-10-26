"use client";

import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/report/EmptyState";
import { Button } from "@/components/ui/Button";
import { LaneRow } from "./LaneRow";
import { LaneDetailPanel } from "./LaneDetailPanel";
import { BAND_ORDER, bandLabel, sortMatches, type Band } from "@/lib/matching/fit";
import { entryLabel, modeLabel, payoffLabel, sprintLabel } from "@/lib/lanes/labels";
import type { LaneDetail, LaneFilterVocab, LaneRowData, LaneSort, LaneView } from "@/lib/lanes/types";
import type { EntryId, ModeId, PayoffId, SprintId } from "@/lib/taxonomy/generated";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { cn } from "@/lib/cn";

type Filters = { family: string; mode: ModeId | "all"; payoff: PayoffId | "all"; entry: EntryId | "all"; sprint: SprintId | "all" };
type ChipKey = "mode" | "payoff" | "entry" | "sprint";

const CHIPS: { key: ChipKey; label: string; labels: Record<string, string> }[] = [
  { key: "mode", label: "Work mode", labels: modeLabel },
  { key: "payoff", label: "Payoff", labels: payoffLabel },
  { key: "entry", label: "Entry", labels: entryLabel },
  { key: "sprint", label: "Try it", labels: sprintLabel },
];

const pick = <T extends string>(v: string | null, allowed: Record<string, string>): T | "all" => (v && v in allowed ? (v as T) : "all");

function matches(l: LaneRowData, f: Filters, skip?: keyof Filters) {
  return (
    (skip === "family" || f.family === "all" || l.familyId === f.family) &&
    (skip === "mode" || f.mode === "all" || l.modes.includes(f.mode)) &&
    (skip === "payoff" || f.payoff === "all" || l.payoff === f.payoff) &&
    (skip === "entry" || f.entry === "all" || l.entry === f.entry) &&
    (skip === "sprint" || f.sprint === "all" || l.sprint === f.sprint)
  );
}

function ChipRow({ label, options, value, onChange }: { label: string; options: { value: string; label: string; count: number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="w-20 shrink-0 label text-ink-3">{label}</span>
      <ul className="-my-1 flex gap-x-4 overflow-x-auto py-1" role="list" aria-label={label}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <li key={o.value} className="shrink-0">
              <button
                type="button"
                aria-pressed={active}
                disabled={o.count === 0 && !active}
                onClick={() => onChange(o.value)}
                className={cn("border-b label transition-quiet disabled:opacity-40", active ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink")}
              >
                {o.label} <span className="text-ink-3">{o.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Rows({ rows, selected, onSelect, showFamily, label }: { rows: LaneRowData[]; selected?: string; onSelect: (id: string) => void; showFamily?: boolean; label: string }) {
  return (
    <ul aria-label={label}>
      {rows.map((l) => (
        <li key={l.id} className="border-b border-rule">
          <LaneRow lane={l} showFamily={showFamily} active={l.id === selected} onSelect={() => onSelect(l.id)} />
        </li>
      ))}
    </ul>
  );
}

function bandCounts(rows: LaneRowData[]) {
  const n: Record<Band, number> = { strong: 0, testing: 0, unlikely: 0, insufficient: 0 };
  for (const r of rows) n[r.band]++;
  return BAND_ORDER.filter((b) => n[b]).map((b) => `${n[b]} ${bandLabel[b].toLowerCase()}`).join(" · ");
}

export function LaneMap({ rows, vocab, detail }: { rows: LaneRowData[]; vocab: LaneFilterVocab; detail: LaneDetail | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const docked = useMediaQuery("(min-width: 1280px)", true);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  const sort: LaneSort = params.get("sort") === "fit-payoff" ? "fit-payoff" : "fit";
  const view: LaneView = params.get("view") === "band" ? "band" : "family";
  const familyParam = params.get("family");
  const f: Filters = {
    family: familyParam && vocab.families.some((x) => x.id === familyParam) ? familyParam : "all",
    mode: pick<ModeId>(params.get("mode"), modeLabel),
    payoff: pick<PayoffId>(params.get("payoff"), payoffLabel),
    entry: pick<EntryId>(params.get("entry"), entryLabel),
    sprint: pick<SprintId>(params.get("sprint"), sprintLabel),
  };
  const selectedId = detail?.row.id;

  const qs = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "all") next.delete(k);
        else next.set(k, v);
      }
      const s = next.toString();
      return s ? `${pathname}?${s}` : pathname;
    },
    [params, pathname],
  );
  // Filters and sorting are client-only: update the URL without a server round-trip.
  const setView = useCallback((updates: Record<string, string | null>) => window.history.replaceState(null, "", qs(updates)), [qs]);
  // Opening a lane fetches its detail from the server.
  const openLane = useCallback((id: string | null) => router.replace(qs({ lane: id }), { scroll: false }), [router, qs]);

  const sorted = useMemo(() => sortMatches(rows.map((r) => ({ match: r, name: r.name, row: r })), sort).map((x) => x.row), [rows, sort]);
  const visible = sorted.filter((l) => matches(l, f));

  const close = useCallback(() => openLane(null), [openLane]);
  const modalOpen = !!detail && !docked;
  useFocusTrap(panelRef, modalOpen, close);
  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  // Families in order of their best lane under the current sort.
  const familyOrder: string[] = [];
  for (const l of visible) if (!familyOrder.includes(l.familyId)) familyOrder.push(l.familyId);
  const families = familyOrder.map((id) => ({ id, name: vocab.families.find((x) => x.id === id)!.name, rows: visible.filter((l) => l.familyId === id) }));

  const anyFilter = f.family !== "all" || f.mode !== "all" || f.payoff !== "all" || f.entry !== "all" || f.sprint !== "all";

  const panel = detail ? <LaneDetailPanel detail={detail} sort={sort} onClose={close} headingId={headingId} /> : null;

  return (
    <div className={cn("grid gap-8", detail && docked && "xl:grid-cols-[minmax(0,1fr)_440px]")}>
      <div className="min-w-0">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-4">
              <span className="w-20 shrink-0 label text-ink-3">Order by</span>
              <SegmentedControl<LaneSort>
                label="Order by"
                value={sort}
                onChange={(v) => setView({ sort: v === "fit" ? null : v })}
                options={[
                  { value: "fit", label: "Relative fit" },
                  { value: "fit-payoff", label: "Fit × payoff" },
                ]}
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="w-20 shrink-0 label text-ink-3 xl:w-auto">Group by</span>
              <SegmentedControl<LaneView>
                label="Group by"
                value={view}
                onChange={(v) => setView({ view: v === "family" ? null : v })}
                options={[
                  { value: "family", label: "Family" },
                  { value: "band", label: "Fit band" },
                ]}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <label htmlFor="lane-family" className="w-20 shrink-0 label text-ink-3">
                Family
              </label>
              <Select id="lane-family" className="h-9 max-w-[320px] text-small" value={f.family} onChange={(e) => setView({ family: e.target.value })}>
                <option value="all">All families ({sorted.filter((l) => matches(l, f, "family")).length})</option>
                {vocab.families.map((x) => {
                  const n = sorted.filter((l) => l.familyId === x.id && matches(l, f, "family")).length;
                  return (
                    <option key={x.id} value={x.id} disabled={n === 0 && f.family !== x.id}>
                      {x.name} ({n})
                    </option>
                  );
                })}
              </Select>
            </div>
            {CHIPS.map((c) => (
              <ChipRow
                key={c.key}
                label={c.label}
                value={f[c.key]}
                onChange={(v) => setView({ [c.key]: v })}
                options={[
                  { value: "all", label: "All", count: sorted.filter((l) => matches(l, f, c.key)).length },
                  ...Object.entries(c.labels).map(([value, label]) => ({
                    value,
                    label,
                    count: sorted.filter((l) => matches(l, { ...f, [c.key]: value } as Filters)).length,
                  })),
                ]}
              />
            ))}
          </div>
        </div>

        <p className="mt-8 flex flex-wrap items-baseline justify-between gap-2 border-b border-rule-strong pb-2">
          <span className="label text-ink-3">
            {visible.length} of {rows.length} career paths · {bandCounts(visible)}
          </span>
          {anyFilter ? (
            <button type="button" className="label text-ink-3 underline-offset-4 hover:text-ink hover:underline" onClick={() => setView({ family: null, mode: null, payoff: null, entry: null, sprint: null })}>
              Clear filters
            </button>
          ) : null}
        </p>

        {visible.length === 0 ? (
          <EmptyState
            className="mt-8"
            title="No career paths match these filters."
            body="Some combinations don't exist, for example winner-take-all career paths you can enter through an apprenticeship."
            action={
              <Button variant="secondary" size="sm" onClick={() => setView({ family: null, mode: null, payoff: null, entry: null, sprint: null })}>
                Clear filters
              </Button>
            }
          />
        ) : view === "band" ? (
          BAND_ORDER.map((b) => {
            const inBand = visible.filter((l) => l.band === b);
            if (!inBand.length) return null;
            return (
              <section key={b} className="mt-10" aria-labelledby={`band-${b}`}>
                <h2 id={`band-${b}`} className="flex items-baseline justify-between border-b border-ink pb-2">
                  <span className="text-h3 font-medium text-ink">{bandLabel[b]}</span>
                  <span className="label text-ink-3">{inBand.length} career paths</span>
                </h2>
                <Rows rows={inBand} selected={selectedId} onSelect={openLane} showFamily label={`${bandLabel[b]} career paths`} />
              </section>
            );
          })
        ) : (
          families.map((fam) => {
            const main = fam.rows.filter((l) => l.band === "strong" || l.band === "testing");
            const rest = fam.rows.filter((l) => l.band === "unlikely" || l.band === "insufficient");
            return (
              <section key={fam.id} className="mt-10" aria-labelledby={`fam-${fam.id}`}>
                <h2 id={`fam-${fam.id}`} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-2">
                  <span className="text-h3 font-medium text-ink">{fam.name}</span>
                  <span className="label text-ink-3">{bandCounts(fam.rows)}</span>
                </h2>
                {main.length ? <Rows rows={main} selected={selectedId} onSelect={openLane} label={`${fam.name} career paths`} /> : null}
                {rest.length ? (
                  <details className="group border-b border-rule" open={rest.some((l) => l.id === selectedId) || !main.length}>
                    <summary className="flex cursor-pointer list-none items-center gap-2 py-3 label text-ink-3 transition-quiet hover:text-ink">
                      <span aria-hidden className="inline-block transition-transform group-open:rotate-90">›</span>
                      {rest.length} unlikely {rest.length === 1 ? "career path" : "career paths"}
                    </summary>
                    <Rows rows={rest} selected={selectedId} onSelect={openLane} label={`Unlikely ${fam.name} career paths`} />
                  </details>
                ) : null}
              </section>
            );
          })
        )}

        <p className="mt-8 max-w-reading text-small text-ink-3">
          {sort === "fit"
            ? "Bands compare each career path with your other career paths, not with other people. A career path is a strong fit only when it's clearly above more than half of yours after allowing for measurement error; most can't be told apart that precisely, so they're worth testing. The dot shows fit against your average career path, with a 90% range."
            : "Fit × payoff reorders career paths within each band by how each pays at the level you'd likely reach. Winner-take-all careers drop unless you're likely to reach the top group."}
        </p>
      </div>

      {docked && detail ? (
        <aside aria-labelledby={headingId} className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] flex-col self-start overflow-hidden rounded-sm border border-rule bg-surface xl:flex">
          {panel}
        </aside>
      ) : null}

      <AnimatePresence>
        {!docked && detail ? (
          <motion.div key="sheet" className="fixed inset-0 z-40" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
            <motion.div className="absolute inset-0 bg-ink/30" onClick={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={headingId}
              className="absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col border-l border-rule bg-surface"
              initial={reduce ? { opacity: 0 } : { x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { x: 24, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            >
              {panel}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
