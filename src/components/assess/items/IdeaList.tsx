"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { fmtTimer } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Timed idea generation (file 09). Enter adds an idea; the list is submitted when time runs out. */
export function IdeaList({ prompt, instructions, seconds, onAnswer }: { prompt: string; instructions?: string; seconds: number; onAnswer: (ideas: string[]) => void }) {
  const [started, setStarted] = useState(false);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [left, setLeft] = useState(seconds);
  const start = useRef(0);
  const submitted = useRef(false);
  const latest = useRef<string[]>([]);
  useEffect(() => {
    latest.current = draft.trim() ? [...ideas, draft.trim()] : ideas;
  }, [ideas, draft]);

  useEffect(() => {
    if (!started) return;
    start.current = performance.now();
    const id = window.setInterval(() => {
      const l = seconds - (performance.now() - start.current) / 1000;
      setLeft(l);
      if (l <= 0 && !submitted.current) {
        submitted.current = true;
        window.clearInterval(id);
        onAnswer(latest.current);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [started, seconds, onAnswer]);

  if (!started) {
    return (
      <div>
        <p className="label text-ink-3">Ideas · {Math.round(seconds / 60 * 10) / 10} minutes</p>
        <h2 className="mt-6 text-h2 font-medium text-ink">{prompt}</h2>
        {instructions ? <p className="mt-3 text-body text-ink-2">{instructions}</p> : null}
        <p className="mt-3 text-small text-ink-3">Type one idea at a time and press Enter. The timer starts when you begin.</p>
        <Button className="mt-8" onClick={() => setStarted(true)}>
          Begin
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
        <p className="label text-ink-3">{ideas.length} ideas</p>
        <p role="timer" aria-label={`${Math.max(0, Math.ceil(left))} seconds left`} className={cn("font-mono text-h3", left <= 15 ? "text-caution" : "text-ink")}>
          {fmtTimer(left)}
        </p>
      </div>
      <h2 className="mt-6 text-h3 font-medium text-ink">{prompt}</h2>
      <form
        className="mt-6 flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) setIdeas((x) => [...x, draft.trim().slice(0, 200)]);
          setDraft("");
        }}
      >
        <label htmlFor="idea" className="sr-only">
          New idea
        </label>
        <Input id="idea" autoFocus autoComplete="off" maxLength={200} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="An idea, then Enter" />
        <Button type="submit" variant="secondary">
          Add
        </Button>
      </form>
      <ol className="mt-6 flex flex-col gap-1" aria-live="polite">
        {ideas.map((x, i) => (
          <li key={i} className="grid grid-cols-[32px_1fr] text-body text-ink-2">
            <span className="font-mono text-small text-ink-3">{String(i + 1).padStart(2, "0")}</span>
            {x}
          </li>
        ))}
      </ol>
      <Button
        variant="ghost"
        className="mt-8"
        onClick={() => {
          if (submitted.current) return;
          submitted.current = true;
          onAnswer(latest.current);
        }}
      >
        I&apos;m done early
      </Button>
    </div>
  );
}
