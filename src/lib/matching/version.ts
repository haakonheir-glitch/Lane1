/**
 * Which matching the app uses: MATCHING_VERSION=v2 selects matching v2 (src/lib/matching/v2);
 * anything else keeps v1, the default until v2 is approved.
 */
export type MatchingVersion = "v1" | "v2";
export const matchingVersion = (): MatchingVersion => (process.env.MATCHING_VERSION === "v2" ? "v2" : "v1");
