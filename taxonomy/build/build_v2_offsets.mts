/**
 * Career offsets for matching v2 (see Offsets in src/lib/matching/v2/fit.ts): each career path's
 * general advantage on the one-sided components, from a reference population of 1,000 simulated
 * people (src/lib/matching/v2/synthetic.ts, fixed seed), for every selectable config: the
 * population's inputs follow each config's input rules (norms, work-value mapping; a config with
 * norms gets the population as percentiles), and the
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
/**
 * v2-0.3's offsets are frozen: the file it was released with (commit f5db165, kept as
 * taxonomy/derived/lane_offsets_v2-0.3.json). v2-0.4 changed the simulated population (reasoning
 * areas), so rebuilding them from today's code would no longer reproduce v2-0.3.
 */
const FROZEN: Record<string, string> = { "v2-0.3": "taxonomy/derived/lane_offsets_v2-0.3.json" };
const configs = Object.fromEntries(
  Object.entries(V2_CONFIGS).map(([version, cfg]) => {
    if (FROZEN[version]) {
      console.log(`${version}: frozen offsets from ${FROZEN[version]}`);
      return [version, (JSON.parse(readFileSync(FROZEN[version]!, "utf8")) as { offsets: unknown }).offsets];
    }
    // A config that reads norms gets a population specified as percentiles (synthetic.ts, specAs),
    // so its reference people sit where real people do; v2-0.3 and v2-0.4 keep the population they
    // were built and validated with.
    const offsets = populationOffsets(population(1000, SEED, cfg.inputs, cfg.inputs.norms ? "percentile" : "anchored"), lanes, cfg);
    const top = Object.entries(offsets as Record<string, { environment: number; challenge: number }>).sort((a, b) => b[1].environment + b[1].challenge - (a[1].environment + a[1].challenge)).slice(0, 3);
    console.log(`${version} largest general advantages:`, top.map(([id, o]) => `${id} env ${o.environment} ch ${o.challenge}`).join("; "));
    return [version, offsets];
  }),
);
writeFileSync("taxonomy/derived/lane_offsets_v2.json", JSON.stringify({ population: { n: 1000, seed: SEED }, configs }) + "\n");
