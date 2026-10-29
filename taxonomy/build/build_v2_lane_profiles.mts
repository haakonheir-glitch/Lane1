/**
 * Compact career profiles for matching v2, from taxonomy/derived/lane_onet_profiles.json:
 * per career path, the O*NET interest (OI) and work-value (EX) profiles, the nine value modes and
 * the environment dimensions (Work Design model, 0–100), and the reasoning-area ability demands.
 * Writes taxonomy/derived/lane_profiles_v2.json, which the app imports (server only), and the
 * role-level equivalent for roles with their own O*NET link (role_profiles_v2.json).
 *
 *   npx tsx taxonomy/build/build_v2_lane_profiles.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { ABILITY_DEMANDS, ENVIRONMENT, VALUE_MODES, WORK_DESIGN_VERSION } from "../../src/lib/workdesign/model";
import { careerWorkDesign, type LaneOnetProfile } from "../../src/lib/workdesign/career";
import { RIASEC, WORK_VALUES, type LaneProfileV2, type LaneProfilesFile, type RoleProfilesFile } from "../../src/lib/matching/v2/types";

type Built = { release: Record<string, string>; lanes: Record<string, LaneOnetProfile & { coverage_confidence: number | null }> };
const built = JSON.parse(readFileSync("taxonomy/derived/lane_onet_profiles.json", "utf8")) as Built;

const RIASEC_NAME = { R: "Realistic", I: "Investigative", A: "Artistic", S: "Social", E: "Enterprising", C: "Conventional" } as const;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const r1 = (x: number) => Math.round(x * 10) / 10;

const lanes: Record<string, LaneProfileV2> = {};
for (const [id, p] of Object.entries(built.lanes)) {
  const d = p.descriptors;
  const interests = RIASEC.map((k) => d["Interests"]?.[RIASEC_NAME[k]]?.["OI"]?.raw ?? null);
  if (interests.some((x) => x === null)) throw new Error(`${id}: incomplete O*NET interest profile`);
  const wv = WORK_VALUES.map((k) => d["Work Values"]?.[k]?.["EX"]?.raw ?? null);
  const wd = careerWorkDesign(p);
  const abilities = ABILITY_DEMANDS.map((a) => {
    // Demand = the importance-weighted mean of the abilities' Level percentiles; importance = mean Importance (1–5).
    const cells = a.abilities.flatMap((name) => {
      const c = d["Abilities"]?.[name];
      return c?.["LV"] && c?.["IM"] ? [{ lv: c["LV"].pct, im: c["IM"].raw }] : [];
    });
    if (!cells.length) return { area: a.area, demand: null, importance: null };
    const w = cells.reduce((s, c) => s + c.im, 0);
    return { area: a.area, demand: r1(cells.reduce((s, c) => s + c.im * c.lv, 0) / w), importance: r3(w / cells.length) };
  });
  lanes[id] = {
    name: p.name,
    provenance: p.provenance,
    coverage: p.coverage_confidence,
    interests: interests.map((x) => r3(x!)),
    values: wv.every((x) => x !== null) ? wv.map((x) => r3(x!)) : null,
    modes: Object.fromEntries(VALUE_MODES.map((m) => [m.id, wd[m.id]!.value === null ? null : r1(wd[m.id]!.value!)])),
    environment: Object.fromEntries(ENVIRONMENT.map((e) => [e.id, wd[e.id]!.value === null ? null : r1(wd[e.id]!.value!)])),
    abilities,
  };
}

const out: LaneProfilesFile = { workDesign: WORK_DESIGN_VERSION, release: built.release, lanes };
writeFileSync("taxonomy/derived/lane_profiles_v2.json", JSON.stringify(out) + "\n");
console.log(`wrote ${Object.keys(lanes).length} career profiles (${Object.values(lanes).filter((l) => !l.values).length} without Work Values)`);

// Roles with their own O*NET link (build_onet_profiles.py, role_onet_profiles.json): the O*NET
// interest profile and the nine value modes, for ranking starting roles from data
// (src/lib/matching/roles.ts). Written to taxonomy/derived/role_profiles_v2.json.
const builtRoles = JSON.parse(readFileSync("taxonomy/derived/role_onet_profiles.json", "utf8")) as { roles: Record<string, Omit<LaneOnetProfile, "name"> & { occupations: { soc: string; title: string; weight: number }[] }> };
const roles: RoleProfilesFile["roles"] = {};
for (const [id, p] of Object.entries(builtRoles.roles)) {
  const d = p.descriptors;
  const interests = RIASEC.map((k) => d["Interests"]?.[RIASEC_NAME[k]]?.["OI"]?.raw ?? null);
  // A role whose occupations have no interest ratings isn't ranked from data.
  if (interests.some((x) => x === null)) continue;
  const wd = careerWorkDesign({ ...p, name: id, coverage_confidence: null });
  roles[id] = {
    occupations: p.occupations.map((o) => o.soc),
    interests: interests.map((x) => r3(x!)),
    modes: Object.fromEntries(VALUE_MODES.map((m) => [m.id, wd[m.id]!.value === null ? null : r1(wd[m.id]!.value!)])),
  };
}
const rolesOut: RoleProfilesFile = { workDesign: WORK_DESIGN_VERSION, release: built.release, roles };
writeFileSync("taxonomy/derived/role_profiles_v2.json", JSON.stringify(rolesOut) + "\n");
console.log(`wrote ${Object.keys(roles).length} role profiles`);
