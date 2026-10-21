"use client";

import { useState } from "react";
import { ButtonLink, Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/** Before cognitive sessions (file 14 environment_check). "No" answers suggest rescheduling. */
export function EnvCheck({ questions, onAnswer }: { questions: string[]; onAnswer: (v: number[]) => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null));
  const done = answers.every((a) => a !== null);
  const anyNo = answers.some((a) => a === 0);
  return (
    <div>
      <p className="label text-ink-3">Before you start</p>
      <h2 className="mt-6 text-h1 font-medium text-ink">A bad testing day adds more noise than anything else.</h2>
      <p className="mt-4 text-body-l text-ink-2">Three quick checks. If any answer is no, it&apos;s better to come back later.</p>
      <ul className="mt-10 border-t border-rule">
        {questions.map((q, i) => (
          <li key={q} className="flex flex-col gap-3 border-b border-rule py-4 sm:flex-row sm:items-center sm:justify-between">
            <span id={`env-${i}`} className="text-body text-ink">
              {q}
            </span>
            <div role="radiogroup" aria-labelledby={`env-${i}`} className="flex gap-2">
              {["Yes", "No"].map((label, v) => {
                const value = v === 0 ? 1 : 0;
                const on = answers[i] === value;
                return (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? value : x)))}
                    className={cn("h-10 w-20 rounded-xs border text-small transition-quiet", on ? "border-ink bg-ink text-bg" : "border-rule bg-surface text-ink hover:border-rule-strong")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      {anyNo ? <p className="mt-6 text-small text-caution">We suggest coming back when you have a quiet 25 minutes. Your progress is saved either way.</p> : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button disabled={!done} onClick={() => onAnswer(answers as number[])}>
          {anyNo ? "Continue anyway" : "Start"}
        </Button>
        {anyNo ? (
          <ButtonLink href="/assess" variant="secondary">
            Come back later
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}
