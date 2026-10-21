"use client";

import type { DeviceInfo, PublicStep, TaskResponse, TaskTurn } from "@/lib/bank/public";
import type { CognitiveTaskId, SessionId } from "@/lib/bank/types";

/* ---- device class and input type (file 14 general_rules.device) ---- */

let lastInput: DeviceInfo["inputType"] = "mouse";
if (typeof window !== "undefined") {
  window.addEventListener("keydown", () => (lastInput = "keyboard"), { capture: true, passive: true });
  window.addEventListener("pointerdown", (e) => (lastInput = e.pointerType === "touch" || e.pointerType === "pen" ? "touch" : "mouse"), { capture: true, passive: true });
}

export function device(): DeviceInfo {
  const w = window.innerWidth;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const deviceClass = coarse ? (Math.min(w, window.innerHeight) < 600 ? "phone" : "tablet") : "desktop";
  return { deviceClass, inputType: lastInput, viewport: `${w}x${window.innerHeight}` };
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export const api = {
  state: (s: SessionId, position?: number) => post<{ step: PublicStep }>(`/api/assess/${s}/state`, { position, device: device() }),
  answer: (s: SessionId, position: number, value: unknown, rtMs: number, skipped = false) =>
    post<{ step: PublicStep }>(`/api/assess/${s}/answer`, { position, value, rtMs, skipped, device: device() }),
  task: (s: SessionId, taskId: CognitiveTaskId, action: { kind: "start" } | { kind: "respond"; index: number; practice: boolean; response: TaskResponse; rtMs: number }) =>
    post<TaskTurn & { next?: PublicStep }>(`/api/assess/${s}/task`, { taskId, action }),
  retake: (s: SessionId) => post<{ attempt: number }>(`/api/assess/${s}/retake`, {}),
};
