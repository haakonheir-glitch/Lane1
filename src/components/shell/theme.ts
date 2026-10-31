"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "./theme-script";

/** Light is the default on every first visit; dark only when the person chooses it. */
export type ThemePref = "light" | "dark";

const listeners = new Set<() => void>();

function read(): ThemePref {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function setThemePref(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* storage unavailable: still apply for this page view */
  }
  const root = document.documentElement;
  if (pref === "dark") root.dataset.theme = "dark";
  else delete root.dataset.theme;
  listeners.forEach((l) => l());
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "light",
  );
}
