/**
 * Matching v2 (docs/MATCHING_V2.md). Selected with MATCHING_VERSION=v2; v1 stays the default
 * until v2 is approved.
 */
import lanesFile from "../../../../taxonomy/derived/lane_profiles_v2.json";
import type { LaneProfileV2, LaneProfilesFile, PersonProfile } from "./types";
import { matchAllV2, type MatchOptions } from "./fit";

export { matchAllV2, computeFit, facetShareBound, checkConfig, profileSeed } from "./fit";
export { topFive, bestByDirection, rankV2, type TopPick } from "./present";
export { V2_CONFIG } from "./config";
export * from "./types";

/** The bundled career profiles (taxonomy/derived/lane_profiles_v2.json). */
export const LANE_PROFILES_V2 = (lanesFile as LaneProfilesFile).lanes as Record<string, LaneProfileV2>;

/** Every career path for a person, against the bundled profiles. */
export const matchV2 = (person: PersonProfile, opts?: MatchOptions) => matchAllV2(person, LANE_PROFILES_V2, opts);
