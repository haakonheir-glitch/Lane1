/**
 * Career offsets for matching v2 (see Offsets in src/lib/matching/v2/fit.ts): each career path's
 * general advantage on the one-sided components, from a reference population of 1,000 simulated
 * people (src/lib/matching/v2/synthetic.ts, fixed seed), for every selectable config: the
 * population's inputs follow each config's input rules (norms, work-value mapping), and the
 * environment offset is computed under need-weighted and flat environment weighting. Writes
 * taxonomy/derived/lane_offsets_v2.json.
 *
 *   npx tsx --conditions=react-server taxonomy/build/build_v2_offsets.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { populationOffsets } from "../../src/lib/matching/v2/fit";
import { population } from "../../src/lib/matching/v2/synthetic";
import { V2_CONFIGS } from "../../src/lib/matching/v2/config";
import type { LaneProfilesFile } from "../../src/lib/matching/v2/types";

const lanes = (JSON.parse(readFileSync("taxonomy/derived/lane_profiles_v2.json", "utf8")) as LaneProfilesFile).lanes;
const SEED = 424242;
const configs = Object.fromEntries(
  Object.entries(V2_CONFIGS).map(([version, cfg]) => {
    const offsets = populationOffsets(population(1000, SEED, cfg.inputs), lanes, cfg);
    const top = Object.entries(offsets).sort((a, b) => b[1].environment + b[1].challenge - (a[1].environment + a[1].challenge)).slice(0, 3);
    console.log(`${version} largest general advantages:`, top.map(([id, o]) => `${id} env ${o.environment} ch ${o.challenge}`).join("; "));
    return [version, offsets];
  }),
);
writeFileSync("taxonomy/derived/lane_offsets_v2.json", JSON.stringify({ population: { n: 1000, seed: SEED }, configs }) + "\n");
