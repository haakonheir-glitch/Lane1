"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Assessment answers, mirrored to sessionStorage so a refresh doesn't lose progress.
 * (Too large for URL params — see PLAN.md D8.)
 */
const EVENT = "lane-answers";

function key(moduleId: string) {
  return `lane-answers:${moduleId}`;
}

/** In-memory fallback for when sessionStorage is blocked. */
const memory = new Map<string, string>();

function readRaw(moduleId: string): string {
  try {
    return sessionStorage.getItem(key(moduleId)) ?? memory.get(moduleId) ?? "{}";
  } catch {
    return memory.get(moduleId) ?? "{}";
  }
}

export function useAnswers<T extends string | number = number>(moduleId: string) {
  const raw = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => readRaw(moduleId),
    () => "{}",
  );

  const answers = useMemo<Record<string, T>>(() => {
    try {
      return JSON.parse(raw) as Record<string, T>;
    } catch {
      return {};
    }
  }, [raw]);

  const setAnswer = useCallback(
    (id: string, value: T) => {
      const next = JSON.stringify({ ...JSON.parse(readRaw(moduleId)), [id]: value });
      memory.set(moduleId, next);
      try {
        sessionStorage.setItem(key(moduleId), next);
      } catch {
        /* storage unavailable */
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [moduleId],
  );

  const reset = useCallback(() => {
    memory.delete(moduleId);
    try {
      sessionStorage.removeItem(key(moduleId));
    } catch {
      /* storage unavailable */
    }
    window.dispatchEvent(new Event(EVENT));
  }, [moduleId]);

  return { answers, setAnswer, reset };
}
