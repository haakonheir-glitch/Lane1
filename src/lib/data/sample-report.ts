/**
 * Everything the /sample report needs, for the fictional sample person. Clearly labelled as a
 * sample wherever it is shown; the effort counts are the assessment's real per-person counts.
 */
import "server-only";
import { bankEffort } from ".";
import { getSamplePicks, getSampleProfile, getSampleUser } from "./sample";

export async function getSampleReport() {
  const [profile, picks, user] = await Promise.all([getSampleProfile(), getSamplePicks(), getSampleUser()]);
  return { profile, picks, person: { name: user.name, reportId: user.reportId }, effort: bankEffort() };
}
