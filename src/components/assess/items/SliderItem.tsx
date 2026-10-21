"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/**
 * slider_0_100 with no default value: the thumb only appears once the person sets it,
 * so an untouched slider can't be mistaken for an answer of 50.
 */
export function SliderItem({ text, value, onAnswer }: { text: string; value: number | undefined; onAnswer: (v: number) => void }) {
  const id = useId();
  const [v, setV] = useState<number | undefined>(value);

  function fromPointer(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setV(Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * 100));
  }
  function onKey(e: KeyboardEvent) {
    const step = e.key === "PageUp" || e.key === "PageDown" ? 10 : 1;
    const cur = v ?? 50;
    const map: Record<string, number> = { ArrowRight: cur + step, ArrowUp: cur + step, PageUp: cur + step, ArrowLeft: cur - step, ArrowDown: cur - step, PageDown: cur - step, Home: 0, End: 100 };
    if (e.key in map) {
      e.preventDefault();
      setV(Math.min(100, Math.max(0, map[e.key]!)));
    }
  }

  return (
    <div>
      <h2 id={id} className="text-h2 font-medium text-ink">
        {text}
      </h2>
      <div className="mt-12">
        <div
          role="slider"
          tabIndex={0}
          aria-labelledby={id}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={v}
          aria-valuetext={v === undefined ? "Not set" : `${v} out of 100`}
          onKeyDown={onKey}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            fromPointer(e);
          }}
          onPointerMove={(e) => e.buttons === 1 && fromPointer(e)}
          className="relative h-10 cursor-pointer touch-none"
        >
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-rule-strong" />
          {[0, 25, 50, 75, 100].map((t) => (
            <div key={t} className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-ink-4" style={{ left: `${t}%` }} />
          ))}
          {v !== undefined ? <div className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink bg-ink" style={{ left: `${v}%` }} /> : null}
        </div>
        <div className="mt-2 flex justify-between label text-ink-3">
          <span>0</span>
          <span className={cn("font-mono text-small", v === undefined ? "text-ink-3" : "text-ink")}>{v === undefined ? "Tap or use arrow keys" : v}</span>
          <span>100</span>
        </div>
      </div>
      <Button className="mt-10" disabled={v === undefined} onClick={() => v !== undefined && onAnswer(v)}>
        Continue
      </Button>
    </div>
  );
}
