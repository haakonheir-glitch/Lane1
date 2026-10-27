/**
 * Shadow mode for Lane's experimental research scales (the "research" items in S1, S2 and S5).
 * They are already scored into `SessionScores.hidden` and stored, never shown. This joins them
 * with the person's Work Design dimensions into one record so they can later be validated
 * against those dimensions offline. Nothing here feeds a dimension, a match or the report.
 */
import type { SessionScores } from "../scoring/profile";
import type { WorkDesignProfile } from "./person";

export type ShadowRecord = {
  kind: "workdesign-shadow";
  version: string;
  /** Hidden (experimental) scores per session, as stored. */
  research: Partial<Record<SessionScores["session"], Record<string, unknown>>>;
  /** The validated-side dimensions they will be checked against. */
  dimensions: Record<string, number | null>;
};

export function shadowRecord(sessions: SessionScores[], wd: WorkDesignProfile): ShadowRecord {
  return {
    kind: "workdesign-shadow",
    version: wd.version,
    research: Object.fromEntries(sessions.filter((s) => Object.keys(s.hidden ?? {}).length).map((s) => [s.session, s.hidden])),
    dimensions: Object.fromEntries([...wd.valueModes, ...wd.environment].map((d) => [d.id, d.value === null ? null : Math.round(d.value * 10) / 10])),
  };
}

/** Logs the record as one JSON line when SHADOW_LOG=1 (server only). Never shown to the person. */
export function logShadow(rec: ShadowRecord, userKey: string) {
  if (process.env.SHADOW_LOG !== "1") return;
  console.info(JSON.stringify({ ...rec, user: userKey }));
}
