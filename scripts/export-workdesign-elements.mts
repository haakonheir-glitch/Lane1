/** Writes the O*NET element names the Work Design model reads, for build_onet_profiles.py to verify. */
import { writeFileSync } from "node:fs";
import { onetElements, WORK_DESIGN_VERSION } from "../src/lib/workdesign/model";

writeFileSync("taxonomy/derived/workdesign_elements.json", JSON.stringify({ version: WORK_DESIGN_VERSION, elements: onetElements() }, null, 2) + "\n");
console.log(`wrote ${onetElements().length} elements`);
