"use client";

import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState } from "@/components/report/EmptyState";
import { Button } from "@/components/ui/Button";
import { LaneRow } from "./LaneRow";
import { LaneDetailPanel } from "./LaneDetailPanel";
import { rankLanes, payoffLabel } from "@/lib/lanes/payoff";
import { groupLabel } from "@/lib/format";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { Lane, LaneGroup, LaneSort, PayoffType, Sprint } from "@/lib/types";
import { cn } from "@/lib/cn";

const GROUPS: LaneGroup[] = ["corporate", "independent", "performance", "craft"];
const PAYOFFS: PayoffType[] = ["linear", "convex", "winner-take-all"];

function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T | "all"; label: string; count: number }[];
  value: T | "all";
  onChange: (v: T | "all") => void;
}) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="w-16 shrink-0 label text-ink-3">{label}</span>
      <ul className="-my-1 flex gap-x-4 overflow-x-auto py-1" role="list">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <li key={o.value} className="shrink-0">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange(o.value)}
                className={cn(
                  "border-b label transition-quiet",
                  active ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink",
                )}
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

export function LaneMap({ lanes, sprints, sprintFor }: { lanes: Lane[]; sprints: Sprint[]; sprintFor: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const docked = useMediaQuery("(min-width: 1280px)", true);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();

  const sort: LaneSort = params.get("sort") === "fit-payoff" ? "fit-payoff" : "fit";
  const group = (GROUPS as string[]).includes(params.get("group") ?? "") ? (params.get("group") as LaneGroup) : "all";
  const payoff = (PAYOFFS as string[]).includes(params.get("payoff") ?? "") ? (params.get("payoff") as PayoffType) : "all";
  const selectedId = params.get("lane");

  const setParam = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // Rank across all lanes so ranks stay stable when filtering.
  const ranked = useMemo(() => rankLanes(lanes, sort), [lanes, sort]);
  const visible = ranked.filter((l) => (group === "all" || l.group === group) && (payoff === "all" || l.payoff === payoff));
  const selected = ranked.find((l) => l.id === selectedId);
  const emphasisId = selected?.id ?? ranked[0]?.id;

  const close = useCallback(() => setParam({ lane: null }), [setParam]);
  const modalOpen = !!selected && !docked;
  useFocusTrap(panelRef, modalOpen, close);
  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  const countBy = <K extends "group" | "payoff">(key: K, v: string) =>
    ranked.filter((l) => l[key] === v && (key === "group" ? payoff === "all" || l.payoff === payoff : group === "all" || l.group === group)).length;

  const panel = selected ? (
    <LaneDetailPanel
      lane={selected}
      sort={sort}
      sprint={sprints.find((s) => s.laneId === selected.id && s.status !== "suggested")}
      planHref={sprintFor[selected.id] ? `/sprints/${sprintFor[selected.id]}` : "/sprints"}
      onClose={close}
      headingId={headingId}
    />
  ) : null;

  return (
    <div className={cn("grid gap-8", selected && docked && "xl:grid-cols-[minmax(0,1fr)_420px]")}>
      <div className="min-w-0">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <span className="w-16 shrink-0 label text-ink-3">Rank by</span>
            <SegmentedControl<LaneSort>
              label="Rank by"
              value={sort}
              onChange={(v) => setParam({ sort: v === "fit" ? null : v })}
              options={[
                { value: "fit", label: "Relative fit" },
                { value: "fit-payoff", label: "Fit × payoff" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-3">
            <FilterRow<LaneGroup>
              label="Group"
              value={group}
              onChange={(v) => setParam({ group: v === "all" ? null : v })}
              options={[
                { value: "all", label: "All", count: ranked.filter((l) => payoff === "all" || l.payoff === payoff).length },
                ...GROUPS.map((g) => ({ value: g, label: groupLabel[g], count: countBy("group", g) })),
              ]}
            />
            <FilterRow<PayoffType>
              label="Payoff"
              value={payoff}
              onChange={(v) => setParam({ payoff: v === "all" ? null : v })}
              options={[
                { value: "all", label: "All", count: ranked.filter((l) => group === "all" || l.group === group).length },
                ...PAYOFFS.map((p) => ({ value: p, label: payoffLabel[p], count: countBy("payoff", p) })),
              ]}
            />
          </div>
        </div>

        <div className="mt-8 hidden grid-cols-[40px_minmax(0,1.3fr)_minmax(0,1fr)_64px_88px_16px] gap-x-4 border-b border-rule-strong pb-2 md:grid">
          <span className="label text-ink-3">#</span>
          <span className="label text-ink-3">Lane</span>
          <span className="label text-ink-3">{sort === "fit" ? "Relative fit" : "Fit × payoff"} · 0–100</span>
          <span className="text-center label text-ink-3">Payoff</span>
          <span className="label text-ink-3">Conf.</span>
          <span />
        </div>
        <div className="mt-8 border-b border-rule-strong md:hidden" />

        {visible.length === 0 ? (
          <EmptyState
            className="mt-8"
            title="No lanes match both filters."
            body="Try widening the payoff filter. Some groups have no lanes of every payoff type."
            action={
              <Button variant="secondary" size="sm" onClick={() => setParam({ group: null, payoff: null })}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <ol aria-label="Lanes, ranked">
            {visible.map((l) => (
              <li key={l.id} className="border-b border-rule">
                <LaneRow lane={l} emphasis={l.id === emphasisId} active={l.id === selected?.id} onSelect={() => setParam({ lane: l.id })} />
              </li>
            ))}
          </ol>
        )}

        <p className="mt-6 max-w-reading text-small text-ink-3">
          {sort === "fit"
            ? "Relative fit compares lanes against your own strengths and weaker areas, not against other people. Lanes within 2.5 points of each other are shown as tied (=)."
            : "Fit × payoff discounts each lane by how it pays at your estimated skill level. Winner-take-all lanes drop unless you are likely to reach the top tier."}
        </p>
      </div>

      {/* Docked panel (≥1280px) */}
      {docked && selected ? (
        <aside aria-labelledby={headingId} className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] flex-col self-start overflow-hidden rounded-sm border border-rule bg-surface xl:flex">
          {panel}
        </aside>
      ) : null}

      {/* Modal panel (<1280px) */}
      <AnimatePresence>
        {!docked && selected ? (
          <motion.div key="sheet" className="fixed inset-0 z-40" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
            <motion.div
              className="absolute inset-0 bg-ink/30"
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
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
