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
import { ABILITY_SPLIT, FitQuadrant } from "./FitQuadrant";
import { BAND_ORDER, bandLabel, sortMatches, type Band } from "@/lib/matching/fit";
import { entryLabel, entryTerm, modeLabel } from "@/lib/lanes/labels";
import type { LaneDetail, LaneFilterVocab, LaneRowData, LaneView } from "@/lib/lanes/types";
import type { EntryId, ModeId } from "@/lib/taxonomy/generated";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { cn } from "@/lib/cn";

type Filters = { family: string; mode: ModeId | "all"; entry: EntryId | "all" };
type ChipKey = "mode" | "entry";

const CHIPS: { key: ChipKey; label: string; labels: Record<string, string>; terms?: Record<string, string> }[] = [
  { key: "mode", label: "Work mode", labels: modeLabel },
  { key: "entry", label: "Getting in", labels: entryLabel, terms: entryTerm },
];

const pick = <T extends string>(v: string | null, allowed: Record<string, string>): T | "all" => (v && v in allowed ? (v as T) : "all");

function matches(l: LaneRowData, f: Filters, skip?: keyof Filters) {
  return (
    (skip === "family" || f.family === "all" || l.familyId === f.family) &&
    (skip === "mode" || f.mode === "all" || l.modes.includes(f.mode)) &&
    (skip === "entry" || f.entry === "all" || l.entry === f.entry)
  );
}

function ChipRow({ label, options, value, onChange }: { label: string; options: { value: string; label: string; count: number; title?: string }[]; value: string; onChange: (v: string) => void }) {
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
                title={o.title}
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
  const wide = useMediaQuery("(min-width: 1280px)", true);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  // The 2×2 needs ability fit for most career paths: without the reasoning tasks, or with too few reasoning
  // areas measured to cover most careers' demands, the lists are the default.
  const withFit = rows.filter((r) => r.fulfilment).length;
  const hasMap = withFit > 0 && rows.filter((r) => r.fulfilment && r.ability).length >= withFit / 2;
  const defaultView: LaneView = hasMap ? "map" : "family";
  const asked = params.get("view");
  const view: LaneView = asked === "band" || asked === "family" || (asked === "map" && hasMap) ? asked : defaultView;
  const familyParam = params.get("family");
  const f: Filters = {
    family: familyParam && vocab.families.some((x) => x.id === familyParam) ? familyParam : "all",
    mode: pick<ModeId>(params.get("mode"), modeLabel),
    entry: pick<EntryId>(params.get("entry"), entryLabel),
  };
  const selectedId = detail?.row.id;
  // Opened from the result cards above the list (?from=top): the docked column sits down in the
  // list, out of view, so use the drawer instead, wherever the person is on the page.
  const docked = wide && params.get("from") !== "top";

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
  const openLane = useCallback((id: string | null) => router.replace(qs({ lane: id, from: null }), { scroll: false }), [router, qs]);

  const sorted = useMemo(() => sortMatches(rows.map((r) => ({ match: r, name: r.name, row: r }))).map((x) => x.row), [rows]);
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

  // Families in order of their best lane.
  const familyOrder: string[] = [];
  for (const l of visible) if (!familyOrder.includes(l.familyId)) familyOrder.push(l.familyId);
  const families = familyOrder.map((id) => ({ id, name: vocab.families.find((x) => x.id === id)!.name, rows: visible.filter((l) => l.familyId === id) }));

  const anyFilter = f.family !== "all" || f.mode !== "all" || f.entry !== "all";

  const panel = detail ? <LaneDetailPanel detail={detail} onClose={close} headingId={headingId} /> : null;

  return (
    <div className={cn("grid gap-8", detail && docked && "xl:grid-cols-[minmax(0,1fr)_440px]")}>
      <div className="min-w-0">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-4">
              <span className="w-20 shrink-0 label text-ink-3 xl:w-auto">View</span>
              <SegmentedControl<LaneView>
                label="View"
                value={view}
                onChange={(v) => setView({ view: v === defaultView ? null : v })}
                options={[
                  ...(hasMap ? [{ value: "map" as const, label: "Fit map" }] : []),
                  { value: "family", label: "Family" },
                  { value: "band", label: "Fit band" },
                ]}
              />
            </div>
            {withFit > 0 && !hasMap ? (
              <p className="text-small text-ink-3">The fit map needs ability fit for most career paths. It comes from the reasoning tasks (sessions S3 and S4), once enough reasoning areas have a result.</p>
            ) : null}
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
                    title: c.terms?.[value],
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
            <button type="button" className="label text-ink-3 underline-offset-4 hover:text-ink hover:underline" onClick={() => setView({ family: null, mode: null, entry: null })}>
              Clear filters
            </button>
          ) : null}
        </p>

        {visible.length === 0 ? (
          <EmptyState
            className="mt-8"
            title="No career paths match these filters."
            body="Some combinations of family, work mode and entry route don't exist."
            action={
              <Button variant="secondary" size="sm" onClick={() => setView({ family: null, mode: null, entry: null })}>
                Clear filters
              </Button>
            }
          />
        ) : view === "map" ? (
          <FitQuadrant rows={visible} selected={selectedId} onSelect={openLane} />
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
          Bands compare each career path with your other career paths, not with other people: your scores are redrawn 500 times within their measurement error, and a
          career path is a strong fit when it lands in your top 10% in at least half of the draws. Fulfilment fit (does the work give you what you need) is the
          headline; 50 is your average career path.{" "}
          {view === "map"
            ? `Ability fit (can you meet what it demands) runs across; to the right of ${ABILITY_SPLIT}, the work asks little beyond your measured reasoning range (an average shortfall under 20 points). Hover a dot for its fits; the cross shows the range 80% of the draws fall in.`
            : "In the lists, the dot shows fulfilment fit against your average career path, with its range."}
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
              // The same starting state on server and client (useReducedMotion is null on the server);
              // reduced motion turns the movement off with a zero-length transition instead.
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.2, 0, 0, 1] }}
            >
              {panel}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
