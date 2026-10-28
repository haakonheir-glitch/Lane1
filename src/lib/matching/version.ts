/**
 * Which matching the app uses: matching v2 (src/lib/matching/v2) by default, approved 2026-10-28.
 * MATCHING_VERSION=v1 switches back to v1, which stays in the code until its deletion is approved.
 */
export type MatchingVersion = "v1" | "v2";
export const matchingVersion = (): MatchingVersion => (process.env.MATCHING_VERSION === "v1" ? "v1" : "v2");
