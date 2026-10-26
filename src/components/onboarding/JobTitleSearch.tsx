"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { JobTitleHit } from "@/lib/taxonomy";
import { cn } from "@/lib/cn";

/**
 * Job-title search (combobox). Type any title, in English or Norwegian; it resolves to a lane
 * through role titles and aliases first, then official ESCO occupation labels.
 */
export function JobTitleSearch({
  label,
  placeholder = "e.g. account executive, sykepleier, YouTuber",
  onSelect,
  autoFocus,
  endpoint = "/api/taxonomy/search",
  errorText = "Search isn't responding. You can skip this step.",
  keepQuery,
}: {
  label: string;
  placeholder?: string;
  onSelect: (hit: JobTitleHit) => void;
  autoFocus?: boolean;
  /** The search route: the signed-in onboarding one by default, or the public one on the landing page. */
  endpoint?: string;
  errorText?: string;
  /** Leave the chosen title in the box (a lookup) instead of clearing it (picking several). */
  keepQuery?: boolean;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<JobTitleHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  /** The query the current `hits` answer, so "no results" never shows for a stale search. */
  const [answered, setAnswered] = useState("");
  /** The title just chosen, when it stays in the box (keepQuery): not a new search. */
  const [picked, setPicked] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2 || query === picked) return;
    const t = window.setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setStatus("loading");
      try {
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { hits: JobTitleHit[] };
        setHits(data.hits);
        setAnswered(query);
        setActive(0);
        setOpen(true);
        setStatus("idle");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setStatus("error");
      }
    }, 150);
    return () => window.clearTimeout(t);
  }, [q, endpoint, picked]);

  function choose(h: JobTitleHit) {
    onSelect(h);
    setPicked(keepQuery ? h.matched : null);
    setQ(keepQuery ? h.matched : "");
    setHits([]);
    setOpen(false);
  }

  const shown = q.trim().length >= 2 ? hits : [];
  const expanded = open && shown.length > 0;
  const noResults = status === "idle" && q.trim().length >= 2 && q.trim() !== picked && answered === q.trim() && hits.length === 0;

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <Search aria-hidden strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          value={q}
          placeholder={placeholder}
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value.trim().length < 2) setOpen(false);
          }}
          onFocus={() => shown.length && setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(shown.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && expanded && shown[active]) {
              e.preventDefault();
              choose(shown[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="h-12 w-full rounded-xs border border-rule bg-surface pl-10 pr-3 text-body text-ink placeholder:text-ink-3 transition-quiet hover:border-rule-strong focus-visible:border-accent"
        />
      </div>
      <p aria-live="polite" className="sr-only">
        {expanded ? `${shown.length} results` : noResults ? "No results" : ""}
      </p>
      <ul
        id={listId}
        role="listbox"
        aria-label={label}
        className={cn("absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-xs border border-rule bg-surface shadow-sm", !expanded && "hidden")}
      >
        {shown.map((h, i) => (
          <li
            key={`${h.laneId}|${h.roleId}|${h.matched}`}
            id={`${id}-opt-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(h)}
            onMouseEnter={() => setActive(i)}
            className={cn("cursor-pointer border-b border-rule px-3 py-2.5 last:border-b-0", i === active && "bg-rule/40")}
          >
            <span className="block text-body text-ink">{h.matched}</span>
            <span className="mt-0.5 block label text-ink-3">
              {h.roleTitle && h.roleTitle !== h.matched ? `${h.roleTitle} · ` : ""}
              {h.laneName} · {h.familyName}
              {h.source === "esco" ? " · official occupation" : ""}
            </span>
          </li>
        ))}
      </ul>
      {noResults ? (
        <p className="mt-2 text-small text-ink-3">No match yet. Try a shorter or more general title.</p>
      ) : null}
      {status === "error" ? <p className="mt-2 text-small text-caution">{errorText}</p> : null}
    </div>
  );
}
