"use client";

import { useEffect, useRef, useState } from "react";

/** Milliseconds since mount (stimulus onset), via performance.now(). */
export function useOnset() {
  const t0 = useRef(0);
  useEffect(() => {
    t0.current = performance.now();
  }, []);
  return () => performance.now() - t0.current;
}

/** Countdown for timed items. Calls onTimeout once. limitSec 0 = untimed (practice). */
export function useCountdown(limitSec: number, onTimeout: () => void) {
  const [left, setLeft] = useState(limitSec);
  const fired = useRef(false);
  const cb = useRef(onTimeout);
  useEffect(() => {
    cb.current = onTimeout;
  });
  useEffect(() => {
    if (!limitSec) return;
    const start = performance.now();
    const id = window.setInterval(() => {
      const l = limitSec - (performance.now() - start) / 1000;
      setLeft(l);
      if (l <= 0 && !fired.current) {
        fired.current = true;
        window.clearInterval(id);
        cb.current();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [limitSec]);
  return left;
}

/** Window keydown handler that ignores modified keys and form fields. */
export function useKeys(handler: (key: string, e: KeyboardEvent) => void, enabled = true) {
  const h = useRef(handler);
  useEffect(() => {
    h.current = handler;
  });
  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      h.current(e.key, e);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

/** Guard so a trial is answered at most once. */
export function useOnce() {
  const done = useRef(false);
  return (fn: () => void) => {
    if (done.current) return;
    done.current = true;
    fn();
  };
}
