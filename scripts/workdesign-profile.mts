/**
 * Read-only: prints the person-side Work Design profile (value modes and environment dimensions,
 * with standard errors) for one account, found by its report ID (or email). Writes nothing.
 *
 *   npx tsx --conditions=react-server scripts/workdesign-profile.mts LN-20261023-H2C          local
 *   DATABASE_URL=… npx tsx --conditions=react-server scripts/workdesign-profile.mts LN-… --force   hosted
 */
import { personWorkDesign } from "../src/lib/workdesign/person";
import { loadAccountProfile } from "./lib-account";

const reportId = process.argv[2];
if (!reportId) throw new Error("Usage: workdesign-profile.mts <report ID>");
const { profile, sessions } = await loadAccountProfile(reportId);
const wd = personWorkDesign(profile);
const f = (v: number | null, se: number | null) => (v === null ? "not measured" : `${v.toFixed(0).padStart(3)} ± ${se!.toFixed(1)} (90%: ${Math.max(0, v - 1.645 * se!).toFixed(0)}–${Math.min(100, v + 1.645 * se!).toFixed(0)})`);
console.log(`Work Design profile ${wd.version} for ${reportId} · sessions ${sessions.join(", ")}`);
console.log("\nValue modes (0–100, SE, 90% range; relative = BLUEPRINT reliability rule)");
for (const m of wd.valueModes) console.log(`  ${`${m.name} (${m.archetype})`.padEnd(24)} ${f(m.value, m.se)}  ${m.relative}  coverage ${(m.coverage * 100).toFixed(0)}%`);
console.log("\nEnvironment dimensions");
for (const e of wd.environment) console.log(`  ${e.name.padEnd(36)} ${f(e.value, e.se)}  coverage ${(e.coverage * 100).toFixed(0)}%`);
console.log(`\nInseparable by design (shared inputs): ${wd.inseparable.map((p) => p.join(" + ")).join(", ")}`);
process.exit(0);
