"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

const textarea =
  "w-full rounded-xs border border-rule bg-surface p-3 text-body text-ink placeholder:text-ink-3 transition-quiet hover:border-rule-strong focus-visible:border-accent";

/** `text` and `number` items. Both can be skipped. */
export function TextItem({
  text,
  kind,
  unit,
  value,
  onAnswer,
  onSkip,
}: {
  text: string;
  kind: "text" | "number";
  unit?: string;
  value: string | number | undefined;
  onAnswer: (v: string | number) => void;
  onSkip: () => void;
}) {
  const id = useId();
  const [v, setV] = useState(value === undefined ? "" : String(value));
  const valid = kind === "text" ? v.trim().length > 0 : v !== "" && Number.isFinite(Number(v)) && Number(v) >= 0;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onAnswer(kind === "number" ? Number(v) : v.trim());
      }}
    >
      <label htmlFor={id} className="block text-h2 font-medium text-ink">
        {text}
      </label>
      <div className="mt-8">
        {kind === "text" ? (
          <>
            <textarea id={id} rows={5} maxLength={2000} value={v} onChange={(e) => setV(e.target.value)} className={textarea} />
            <p className="mt-2 text-right label text-ink-3">{v.length} / 2000</p>
          </>
        ) : (
          <div className="flex max-w-[240px] items-center gap-3">
            <Input id={id} type="number" inputMode="numeric" min={0} value={v} onChange={(e) => setV(e.target.value)} className="font-mono" />
            {unit ? <span className="label text-ink-3">{unit}</span> : null}
          </div>
        )}
      </div>
      <div className="mt-8 flex items-center gap-4">
        <Button type="submit" disabled={!valid}>
          Continue
        </Button>
        <button type="button" onClick={onSkip} className="label text-ink-3 transition-quiet hover:text-ink">
          Skip this one
        </button>
      </div>
    </form>
  );
}
