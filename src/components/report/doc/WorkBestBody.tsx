import type { ReactNode } from "react";
import { ArchetypeBlend } from "@/components/workdesign/ArchetypeBlend";
import { DimensionIntervals } from "@/components/workdesign/DimensionIntervals";
import type { WorkBest } from "@/lib/workdesign/best";
import type { BestWorkday } from "@/lib/report/schema";

const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * Chapter 01 body, "How you work best": the archetype blend (a metaphor), the value modes with
 * their 90% intervals, the best workday Claude wrote from the Work Design JSON (each sentence shows
 * the dimensions it rests on), and what drains you. Everything except the workday is computed.
 * `workdayEmpty` is what to show when there is no checked best workday yet. Server component.
 */
export function WorkBestBody({ wb, workday, workdayEmpty }: { wb: WorkBest; workday: BestWorkday | null | undefined; workdayEmpty: ReactNode }) {
  const names = new Map([...wb.modes.map((m) => [m.id, m.name] as const), ...wb.conditions.map((c) => [c.id, c.name] as const)]);
  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="wb-blend">
        <h3 id="wb-blend" className="label text-ink-3">Your archetype blend</h3>
        {wb.archetype ? (
          <div className="mt-4 max-w-[760px]">
            <ArchetypeBlend blend={wb.archetype} />
            {wb.archetype.reason ? <p className="mt-4 text-body text-ink-2">{wb.archetype.reason}</p> : null}
            {wb.archetype.caveat ? <p className="mt-2 text-body text-ink-2">{wb.archetype.caveat}</p> : null}
          </div>
        ) : (
          <p className="mt-4 max-w-[64ch] text-body text-ink-2">The blend needs all nine value modes; some aren&apos;t measured yet.</p>
        )}
      </section>

      <section aria-labelledby="wb-modes">
        <h3 id="wb-modes" className="label text-ink-3">Value modes: the kind of value you create</h3>
        <p className="mt-2 max-w-[68ch] text-small text-ink-3">
          Each mode is built from your interests, personality and tasks. The band is the 90% range; the tick is the middle of the scale. These are your scores placed on
          the scale, not percentiles: there is no comparison with other people.
        </p>
        <div className="mt-4">
          <DimensionIntervals label="Value modes" rows={wb.modes.map((m) => ({ id: m.id, name: m.name, archetype: m.archetype, poles: m.poles, value: m.value, lo: m.lo, hi: m.hi, relative: m.relative }))} />
        </div>
        {wb.inseparable.length ? (
          <p className="mt-3 text-small text-ink-3">
            Built from the same scores, so read together:{" "}
            {wb.inseparable.map(([a, b]) => `${names.get(a)} and ${names.get(b)}`).join(" · ")}.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="wb-day">
        <h3 id="wb-day" className="label text-ink-3">Your best workday</h3>
        {workday?.sentences.length ? (
          <figure className="mt-4 max-w-[760px]">
            <ol className="flex flex-col gap-3">
              {workday.sentences.map((s, i) => (
                <li key={i} className="grid gap-x-6 gap-y-1 sm:grid-cols-[minmax(0,1fr)_180px]">
                  <span className="text-body-l text-ink">{s.text}</span>
                  <span className="text-label text-ink-3 sm:pt-1.5">{s.sources.map((id) => names.get(id) ?? id).join(" · ")}</span>
                </li>
              ))}
            </ol>
            <figcaption className="mt-4 text-small text-ink-3">
              Written by Claude from your Work Design results only. Beside each sentence: the dimensions it rests on. A check rejects any sentence without a source, or that names
              anything not in your results.
            </figcaption>
          </figure>
        ) : (
          <div className="mt-4 max-w-[760px]">{workdayEmpty}</div>
        )}
      </section>

      <section aria-labelledby="wb-drains">
        <h3 id="wb-drains" className="label text-ink-3">What drains you</h3>
        {wb.drains.length ? (
          <>
            <ul className="mt-4 grid gap-4 md:grid-cols-3">
              {wb.drains.map((d) => (
                <li key={d.id} className="rounded-sm border border-rule p-4">
                  <p className="text-body font-medium text-ink">{d.name}</p>
                  <p className="mt-1 text-small text-ink-2">
                    {d.side === "too_little" ? "Too little of it: " : "Too much of it: "}
                    {d.drainedBy.toLowerCase()}.
                  </p>
                  <p className="mt-3 font-mono text-label text-ink-3">Misses your need in {pct(d.common)} of career paths</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 max-w-[68ch] text-small text-ink-3">
              The working conditions where a mismatch costs you most in matching: your clearest needs (scores clear of the middle by more than their 90% range).
            </p>
          </>
        ) : (
          <p className="mt-4 max-w-[64ch] text-body text-ink-2">No working condition stands out clearly enough to name: your needs sit near the middle, or their ranges are still wide.</p>
        )}
        <div className="mt-8">
          <DimensionIntervals
            label="Working conditions you need"
            rows={wb.conditions.map((c) => ({ id: c.id, name: c.name, poles: c.poles, value: c.value, lo: c.lo, hi: c.hi }))}
          />
        </div>
      </section>
    </div>
  );
}
