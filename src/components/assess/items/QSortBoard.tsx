"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { LikertOption } from "@/lib/bank/types";
import { cn } from "@/lib/cn";

/**
 * forced_q_sort as a sequence of picks (the package's mobile flow, used on every device so it
 * works the same with keyboard, mouse and touch): most important → least important → the
 * remaining columns from the outside in; the last column takes whatever is left.
 * The result always has exactly the required number of cards per column.
 */
export function QSortBoard({
  stem,
  cards,
  columns,
  capacities,
  onAnswer,
}: {
  stem: string;
  cards: { id: string; text: string }[];
  columns: LikertOption[];
  capacities: number[];
  onAnswer: (sort: Record<string, number>) => void;
}) {
  // Column order to fill: first, last, second, second-last, … (middle last, filled automatically).
  const order = useMemo(() => {
    const idx = columns.map((_, i) => i);
    const out: number[] = [];
    while (idx.length) {
      out.push(idx.shift()!);
      if (idx.length) out.push(idx.pop()!);
    }
    return out;
  }, [columns]);

  const [placed, setPlaced] = useState<Record<string, number>>({}); // cardId → column index
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);

  const col = order[step]!;
  const need = capacities[col]!;
  const remaining = cards.filter((c) => !(c.id in placed));
  const isLast = step === order.length - 1;

  function describe(i: number, nth: number) {
    const n = capacities[i]!;
    if (nth === 0) return `Pick the ${n} that matter most to you`;
    if (nth === 1) return `Now pick the ${n} that matter least`;
    if (nth === order.length - 1) return `The remaining ${n} go in the middle`;
    return nth % 2 === 0 ? `Of the rest, pick the ${n} that matter more` : `Of the rest, pick the ${n} that matter less`;
  }

  function confirm() {
    const chosen = isLast ? remaining.map((c) => c.id) : picked;
    const next = { ...placed, ...Object.fromEntries(chosen.map((id) => [id, col])) };
    setPlaced(next);
    setPicked([]);
    if (isLast) onAnswer(Object.fromEntries(Object.entries(next).map(([id, c]) => [id, columns[c]!.value])));
    else setStep(step + 1);
  }

  function back() {
    if (step === 0) return;
    const prevCol = order[step - 1]!;
    setPlaced((p) => Object.fromEntries(Object.entries(p).filter(([, c]) => c !== prevCol)));
    setPicked([]);
    setStep(step - 1);
  }

  return (
    <div>
      <p className="label text-ink-3">
        Card sort · step {step + 1} of {order.length}
      </p>
      <h2 className="mt-4 text-h2 font-medium text-ink">{describe(col, step)}</h2>
      <p className="mt-2 text-body text-ink-2">{stem}</p>

      <div className="mt-8 grid gap-2 sm:grid-cols-2" role="group" aria-label="Cards">
        {remaining.map((c) => {
          const on = picked.includes(c.id) || isLast;
          const full = !on && picked.length >= need;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              disabled={isLast || full}
              onClick={() => setPicked((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))}
              className={cn(
                "min-h-14 rounded-xs border px-4 py-3 text-left text-body transition-quiet",
                on ? "border-ink bg-ink text-bg" : "border-rule bg-surface text-ink hover:border-rule-strong",
                full && "opacity-40",
              )}
            >
              …{c.text}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Button onClick={confirm} disabled={!isLast && picked.length !== need}>
          {isLast ? "Finish sort" : `Confirm ${picked.length}/${need}`}
        </Button>
        {step > 0 ? (
          <Button variant="ghost" onClick={back}>
            Back a step
          </Button>
        ) : null}
      </div>

      <ol className="mt-10 grid gap-2 border-t border-rule pt-4 sm:grid-cols-5" aria-label="Your sort so far">
        {columns.map((c, i) => (
          <li key={c.value} className="text-small">
            <p className="label text-ink-3">
              {c.label || `Column ${i + 1}`} · {Object.values(placed).filter((x) => x === i).length}/{capacities[i]}
            </p>
            <ul className="mt-1 text-ink-2">
              {cards
                .filter((card) => placed[card.id] === i)
                .map((card) => (
                  <li key={card.id} className="truncate" title={card.text}>
                    {card.text}
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
