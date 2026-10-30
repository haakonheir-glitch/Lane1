/**
 * Matching v2 (docs/MATCHING_V2.md): the app's career fit. Matching v1 was removed on 2026-10-28.
 */
import lanesFile from "../../../../taxonomy/derived/lane_profiles_v2.json";
import offsetsFile from "../../../../taxonomy/derived/lane_offsets_v2.json";
import rolesFile from "../../../../taxonomy/derived/role_profiles_v2.json";
import type { FitV2, LaneProfileV2, LaneProfilesFile, PersonProfile, RoleProfileV2, RoleProfilesFile } from "./types";
import { computeFit as computeFitIn, matchAllV2, type MatchOptions, type Offsets } from "./fit";
import { V2_CONFIG, type V2Config } from "./config";

export { matchAllV2, facetShares, envGuardFor, profileSeed, populationOffsets, penaltyOf, needWeight, effectiveWeights, type Offsets } from "./fit";
export { topFive, bestByDirection, rankV2, directionsOf, type TopPick, type DirectionGroup } from "./present";
export { applyGates, type OptIns } from "./gates";
export { V2_CONFIG, V2_CONFIGS, DEFAULT_V2_VERSION, selectConfig, TALENT_NOTE, BELIEF_NOTE, type V2Config } from "./config";
export * from "./types";

/** The bundled career profiles (taxonomy/derived/lane_profiles_v2.json). */
export const LANE_PROFILES_V2 = (lanesFile as LaneProfilesFile).lanes as Record<string, LaneProfileV2>;
/** Which O*NET build the bundled profiles come from (for cache keys). */
/** A short content hash, so a rebuilt data file is a new cache key even when its shape is unchanged. */
const hash = (x: unknown) => {
  const text = JSON.stringify(x);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
};
export const LANE_PROFILES_V2_STAMP = `${(lanesFile as LaneProfilesFile).workDesign}:${Object.values((lanesFile as LaneProfilesFile).release).join("/")}:${hash(lanesFile)}:${hash(offsetsFile)}:${hash(rolesFile)}`;

/** Roles with their own O*NET link (taxonomy/derived/role_profiles_v2.json), for ranking starting roles. */
export const ROLE_PROFILES_V2 = (rolesFile as RoleProfilesFile).roles as Record<string, RoleProfileV2>;

const OFFSETS = offsetsFile.configs as Record<string, Offsets>;
/** The bundled career offsets for a config (taxonomy/derived/lane_offsets_v2.json, from a fixed reference population). */
export const offsetsFor = (cfg: V2Config = V2_CONFIG): Offsets => {
  const o = OFFSETS[cfg.version];
  if (!o) throw new Error(`No career offsets built for ${cfg.version}: run taxonomy/build/build_v2_offsets.mts`);
  return o;
};
/** The offsets for the running config. */
export const LANE_OFFSETS_V2 = offsetsFor();

/** Every career path for a person, against the bundled profiles and the config's offsets. */
export const matchV2 = (person: PersonProfile, opts?: MatchOptions) => matchAllV2(person, LANE_PROFILES_V2, { offsets: offsetsFor(opts?.config ?? V2_CONFIG), ...opts });

/** One career path for one person (the brief's computeFit), by id or profile, against the bundled field. */
export const computeFit = (person: PersonProfile, lane: string | LaneProfileV2, field: Record<string, LaneProfileV2> = LANE_PROFILES_V2, opts?: MatchOptions): FitV2 =>
  computeFitIn(person, lane, field, { offsets: field === LANE_PROFILES_V2 ? offsetsFor(opts?.config ?? V2_CONFIG) : undefined, ...opts });
