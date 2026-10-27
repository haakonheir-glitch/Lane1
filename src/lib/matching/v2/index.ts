/**
 * Matching v2 (docs/MATCHING_V2.md). Selected with MATCHING_VERSION=v2; v1 stays the default
 * until v2 is approved.
 */
import lanesFile from "../../../../taxonomy/derived/lane_profiles_v2.json";
import type { FitV2, LaneProfileV2, LaneProfilesFile, PersonProfile } from "./types";
import { computeFit as computeFitIn, matchAllV2, type MatchOptions } from "./fit";

export { matchAllV2, facetShares, profileSeed } from "./fit";
export { topFive, bestByDirection, rankV2, type TopPick } from "./present";
export { V2_CONFIG } from "./config";
export * from "./types";

/** The bundled career profiles (taxonomy/derived/lane_profiles_v2.json). */
export const LANE_PROFILES_V2 = (lanesFile as LaneProfilesFile).lanes as Record<string, LaneProfileV2>;
/** Which O*NET build the bundled profiles come from (for cache keys). */
export const LANE_PROFILES_V2_STAMP = `${(lanesFile as LaneProfilesFile).workDesign}:${Object.values((lanesFile as LaneProfilesFile).release).join("/")}`;

/** Every career path for a person, against the bundled profiles. */
export const matchV2 = (person: PersonProfile, opts?: MatchOptions) => matchAllV2(person, LANE_PROFILES_V2, opts);

/** One career path for one person (the brief's computeFit), by id or profile, against the bundled field. */
export const computeFit = (person: PersonProfile, lane: string | LaneProfileV2, field: Record<string, LaneProfileV2> = LANE_PROFILES_V2, opts?: MatchOptions): FitV2 =>
  computeFitIn(person, lane, field, opts);
