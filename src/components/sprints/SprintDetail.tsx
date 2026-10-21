"use client";

import { useState, type FormEvent } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { LineChart } from "@/components/data/LineChart";
import { SegmentedProgress } from "@/components/data/SegmentedProgress";
import { SectionHeader } from "@/components/report/SectionHeader";
import { EmptyState } from "@/components/report/EmptyState";
import { CheckInScale } from "./CheckInScale";
import { addDays, formatDay, pad2 } from "@/lib/format";
import type { CheckIn, LogEntry, Sprint } from "@/lib/types";
import { cn } from "@/lib/cn";


/** The improvement-chart value for one log entry. */
function derive(sprint: Sprint, entry: LogEntry): number | null {
  const num = entry.values[sprint.chart.numerator];
  if (num === undefined) return null;
  if (!sprint.chart.denominator) return num;
  const den = entry.values[sprint.chart.denominator];
  if (!den) return null;
  return Math.round((num / den) * (sprint.chart.scale ?? 1) * 10) / 10;
}

export function SprintDetail({ sprint }: { sprint: Sprint }) {
  const today = sprint.status === "active" ? (sprint.currentDay ?? 1) : null;
  const [tasks, setTasks] = useState(sprint.tasks);
  const [checkIns, setCheckIns] = useState<CheckIn[]>(sprint.checkIns);
  const [log, setLog] = useState<LogEntry[]>(sprint.log);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const busy = false;

  const todaysCheckIn = today ? checkIns.find((c) => c.day === today) : undefined;
  const [pending, setPending] = useState<{ energy: number | null; flow: number | null; continue: number | null }>({
    energy: todaysCheckIn?.energy ?? null,
    flow: todaysCheckIn?.flow ?? null,
    continue: todaysCheckIn?.continue ?? null,
  });

  const done = tasks.filter((t) => t.done).length;

  // Improvement chart: prior days in ink-4, the series itself in accent.
  const points = log
    .map((e) => ({ day: e.day, y: derive(sprint, e) }))
    .filter((p): p is { day: number; y: number } => p.y !== null && (p.y > 0 || !sprint.chart.denominator));
  const xLabels = points.map((p) => `D${pad2(p.day)}`);
  const maxY = Math.max(10, ...points.map((p) => p.y));
  const yMax = Math.ceil(maxY / 10) * 10;

  function saveCheckIn() {
    if (!today || pending.energy === null || pending.flow === null || pending.continue === null) return;
    const entry: CheckIn = { day: today, energy: pending.energy, flow: pending.flow, continue: pending.continue };
    // Sample sprint: changes stay in this page (sprints go live together with results, PLAN.md D18).
    setCheckIns((prev) => [...prev.filter((c) => c.day !== today), entry].sort((a, b) => a.day - b.day));
    setSaved(true);
  }

  function toggleTask(day: number, checked: boolean) {
    setTasks((prev) => prev.map((x) => (x.day === day ? { ...x, done: checked } : x)));
  }

  function addLog(e: FormEvent) {
    e.preventDefault();
    if (!today) return;
    const values: Record<string, number> = {};
    for (const m of sprint.metrics) {
      const v = Number(draft[m.key]);
      if (draft[m.key] === undefined || draft[m.key] === "" || !Number.isFinite(v) || v < 0) return;
      values[m.key] = v;
    }
    const note = draft.note || undefined;
    setLog((prev) => [...prev.filter((l) => l.day !== today), { day: today, values, note }].sort((a, b) => a.day - b.day));
    setDraft({});
  }

  const draftComplete = sprint.metrics.every((m) => draft[m.key] !== undefined && draft[m.key] !== "");

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-8 [&>*]:min-w-0">

      {/* Tasks */}
      <section className="lg:col-span-7" aria-labelledby="tasks-h">
        <SectionHeader index="01" label="Plan" title="Day by day" id="tasks-h" aside={`${done}/${sprint.days} done`} />
        <SegmentedProgress total={sprint.days} done={done} current={today ?? undefined} label={`${done} of ${sprint.days} tasks done`} />
        <ol className="mt-6">
          {tasks.map((t) => {
            const isToday = t.day === today;
            const date = sprint.startedOn ? formatDay(addDays(sprint.startedOn, t.day - 1)) : null;
            return (
              <li
                key={t.day}
                className={cn(
                  "grid grid-cols-[48px_24px_1fr] items-start gap-x-3 border-b border-rule py-4",
                  isToday && "-mx-3 border-l-2 border-l-accent bg-accent-wash px-3",
                )}
              >
                <span className={cn("pt-0.5 font-mono text-label uppercase", isToday ? "text-accent" : "text-ink-3")}>
                  D{pad2(t.day)}
                  {date ? <span className={cn("mt-0.5 block", isToday ? "text-ink-2" : "text-ink-3")}>{date}</span> : null}
                </span>
                <span className="pt-1">
                  <Checkbox
                    aria-label={`Day ${t.day}: ${t.title}`}
                    checked={t.done}
                    disabled={today === null || t.day > today}
                    onChange={(e) => toggleTask(t.day, e.currentTarget.checked)}
                  />
                </span>
                <div className="min-w-0">
                  <p className={cn("text-body", t.done ? "text-ink-3 line-through decoration-ink-4" : "text-ink")}>
                    {t.title}
                    {isToday ? <span className="ml-2 label text-accent">Today</span> : null}
                  </p>
                  {t.detail ? <p className={cn("mt-0.5 text-small", isToday ? "text-ink-2" : "text-ink-3")}>{t.detail}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Check-in, log, chart */}
      <div className="flex flex-col gap-12 lg:col-span-5">
        <section aria-labelledby="checkin-h">
          <SectionHeader index="02" label="Daily check-in" title={today ? `Day ${today}` : "Check-ins"} id="checkin-h" as="h3" />
          {today ? (
            <div className="flex flex-col gap-6">
              <CheckInScale label="Energy" anchors={["Drained", "Energised"]} value={pending.energy} onChange={(v) => { setPending((p) => ({ ...p, energy: v })); setSaved(false); }} />
              <CheckInScale label="Flow" anchors={["Distracted", "Absorbed"]} value={pending.flow} onChange={(v) => { setPending((p) => ({ ...p, flow: v })); setSaved(false); }} />
              <CheckInScale label="Want to continue" anchors={["Not at all", "Very much"]} value={pending.continue} onChange={(v) => { setPending((p) => ({ ...p, continue: v })); setSaved(false); }} />
              <div className="flex items-center gap-4">
                <Button variant="secondary" size="sm" onClick={saveCheckIn} disabled={busy || pending.energy === null || pending.flow === null || pending.continue === null}>
                  Save check-in
                </Button>
                <span className="label text-ink-3" aria-live="polite">
                  {saved ? "Saved for today" : ""}
                </span>
              </div>
            </div>
          ) : (
            <CheckInHistory checkIns={checkIns} />
          )}
          {today && checkIns.length > 0 ? (
            <div className="mt-8">
              <CheckInHistory checkIns={checkIns} />
            </div>
          ) : null}
        </section>

        <section aria-labelledby="chart-h">
          <SectionHeader index="03" label="Improvement" title={sprint.chart.label} id="chart-h" as="h3" />
          {points.length >= 2 ? (
            <LineChart
              series={[{ id: "series", label: sprint.chart.label, points: points.map((p, i) => ({ x: i, y: p.y })), emphasis: true }]}
              xLabels={xLabels}
              yDomain={[0, yMax]}
              yTicks={[0, yMax / 2, yMax]}
              unit={sprint.chart.unit}
              endLabels={false}
              height={180}
              label={`${sprint.chart.label} by day: ${points.map((p) => `day ${p.day} ${p.y}${sprint.chart.unit}`).join(", ")}`}
            />
          ) : (
            <EmptyState title="Not enough data yet." body="The chart appears after two logged days with activity." />
          )}
        </section>
      </div>

      {/* Performance log — full width */}
      <section className="lg:col-span-12" aria-labelledby="log-h">
        <SectionHeader index="04" label="Performance log" title="Raw numbers" id="log-h" as="h3" />
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" tabIndex={0} role="region" aria-label="Performance log, scrollable">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <caption className="sr-only">Performance log</caption>
            <thead>
              <tr className="border-b border-rule-strong">
                <th scope="col" className="py-2 pr-4 label font-normal text-ink-3">Day</th>
                {sprint.metrics.map((m) => (
                  <th key={m.key} scope="col" className="py-2 pr-4 text-right label font-normal text-ink-3">
                    {m.label} <span className="text-ink-3">{m.unit}</span>
                  </th>
                ))}
                <th scope="col" className="py-2 pr-4 text-right label font-normal text-ink-3">
                  {sprint.chart.label} <span className="text-ink-3">{sprint.chart.unit}</span>
                </th>
                <th scope="col" className="py-2 label font-normal text-ink-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {log.map((e) => {
                const d = derive(sprint, e);
                return (
                  <tr key={e.day} className="border-b border-rule">
                    <th scope="row" className="py-3 pr-4 font-mono text-small font-normal text-ink-2">D{pad2(e.day)}</th>
                    {sprint.metrics.map((m) => (
                      <td key={m.key} className="py-3 pr-4 text-right font-mono text-small text-ink">
                        {e.values[m.key] ?? "—"}
                      </td>
                    ))}
                    <td className="py-3 pr-4 text-right font-mono text-small text-ink">{d ?? "—"}</td>
                    <td className="py-3 text-small text-ink-3">{e.note ?? ""}</td>
                  </tr>
                );
              })}
              {log.length === 0 ? (
                <tr>
                  <td colSpan={sprint.metrics.length + 3} className="py-6 text-small text-ink-3">
                    Nothing logged yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {today ? (
          <form onSubmit={addLog} className="mt-6 grid grid-cols-2 items-end gap-4 sm:grid-cols-[repeat(auto-fit,minmax(120px,1fr))]">
            <p className="col-span-full label text-ink-3">Log day {today}</p>
            {sprint.metrics.map((m) => (
              <label key={m.key} className="flex flex-col gap-2">
                <span className="label text-ink-3">
                  {m.label} ({m.unit})
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  className="font-mono"
                  value={draft[m.key] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [m.key]: e.target.value }))}
                />
              </label>
            ))}
            <label className="col-span-2 flex flex-col gap-2 sm:col-span-1">
              <span className="label text-ink-3">Note</span>
              <Input value={draft.note ?? ""} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} />
            </label>
            <Button type="submit" variant="secondary" disabled={busy || !draftComplete}>
              {log.some((l) => l.day === today) ? "Replace today's row" : "Add row"}
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

function CheckInHistory({ checkIns }: { checkIns: CheckIn[] }) {
  if (checkIns.length === 0) {
    return <p className="text-small text-ink-3">No check-ins recorded.</p>;
  }
  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">Check-in history</caption>
      <thead>
        <tr className="border-b border-rule-strong">
          {["Day", "Energy", "Flow", "Continue"].map((h, i) => (
            <th key={h} scope="col" className={cn("py-2 label font-normal text-ink-3", i > 0 && "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {checkIns.map((c) => (
          <tr key={c.day} className="border-b border-rule">
            <th scope="row" className="py-2 font-mono text-small font-normal text-ink-2">D{pad2(c.day)}</th>
            <td className="py-2 text-right font-mono text-small text-ink">{c.energy}</td>
            <td className="py-2 text-right font-mono text-small text-ink">{c.flow}</td>
            <td className="py-2 text-right font-mono text-small text-ink">{c.continue}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
